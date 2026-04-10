/**
 * PATCH /api/purchase-orders/[id]/receive
 *
 * Records received quantities for PO line items, recomputes PO status,
 * and — when Shopify credentials are configured — creates a Shopify fulfillment
 * for each affected order.
 *
 * After saving, callers should re-sync (GET /api/sync/shopify) to pull the
 * latest Shopify fulfillment status back into the local DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { parseBody, receiveLineItemsSchema } from '@/lib/api/schemas';
import { toApiErrorResponse } from '@/lib/core/errors';
import {
  getShopifyAdminEnv,
  isShopifyAdminEnvConfigured,
} from '@/lib/shopify/env';
import { createShopifyFulfillment } from '@/lib/shopify/createFulfillment';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !getOfficeOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Office or admin access required' },
        { status: 403 },
      );
    }

    const { id: purchaseOrderId } = await context.params;

    const result = await parseBody(request, receiveLineItemsSchema);
    if ('error' in result) return result.error;
    const { items } = result.data;

    // ── Verify PO exists ────────────────────────────────────────────────────
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: { id: true, status: true },
    });
    if (!po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 },
      );
    }

    // ── Update quantityReceived for each specified line item ────────────────
    const itemIds = items.map((i) => i.id);
    const itemMap = new Map(items.map((i) => [i.id, i.quantityReceived]));

    // Validate all item IDs belong to this PO before writing
    const existingItems = await prisma.purchaseOrderLineItem.findMany({
      where: { id: { in: itemIds }, purchaseOrderId },
      select: {
        id: true,
        quantity: true,
        quantityReceived: true,
        shopifyOrderLineItemId: true,
        shopifyOrderLineItem: {
          select: {
            shopifyGid: true,
            order: { select: { id: true, shopifyGid: true } },
          },
        },
      },
    });

    if (existingItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'One or more line items not found in this purchase order' },
        { status: 400 },
      );
    }

    // Batch-update quantityReceived
    await prisma.$transaction(
      existingItems.map((item) =>
        prisma.purchaseOrderLineItem.update({
          where: { id: item.id },
          data: { quantityReceived: itemMap.get(item.id)! },
        }),
      ),
    );

    // ── Recompute PO status from all line items ─────────────────────────────
    const allLineItems = await prisma.purchaseOrderLineItem.findMany({
      where: { purchaseOrderId },
      select: { quantity: true, quantityReceived: true },
    });

    const allFulfilled =
      allLineItems.length > 0 &&
      allLineItems.every((li) => li.quantityReceived >= li.quantity);
    const anyFulfilled = allLineItems.some((li) => li.quantityReceived > 0);

    const newStatus = allFulfilled
      ? 'fulfilled'
      : anyFulfilled
        ? 'partially_fulfilled'
        : 'unfulfilled';

    await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: newStatus,
        ...(allFulfilled ? { receivedAt: new Date() } : {}),
      },
    });

    // ── Shopify outbound fulfillment ────────────────────────────────────────
    // Group items by Shopify order and push fulfillments to Shopify.
    // Errors are logged but do NOT fail the response — the local DB is
    // already updated. Callers should re-sync to reconcile statuses.
    const shopifyErrors: string[] = [];

    if (isShopifyAdminEnvConfigured()) {
      // Build a map: shopifyOrderGid → [{shopifyLineItemGid, quantity}]
      const byOrder = new Map<
        string,
        Array<{ shopifyLineItemGid: string; quantity: number }>
      >();

      for (const item of existingItems) {
        const newQty = itemMap.get(item.id)!;
        const delta = newQty - item.quantityReceived;
        if (delta <= 0) continue; // No increase — skip

        const lineItemGid = item.shopifyOrderLineItem?.shopifyGid;
        const orderGid = item.shopifyOrderLineItem?.order?.shopifyGid;
        if (!lineItemGid || !orderGid) continue;

        if (!byOrder.has(orderGid)) byOrder.set(orderGid, []);
        byOrder
          .get(orderGid)!
          .push({ shopifyLineItemGid: lineItemGid, quantity: delta });
      }

      if (byOrder.size > 0) {
        const creds = getShopifyAdminEnv();
        await Promise.allSettled(
          [...byOrder.entries()].map(async ([orderGid, lineItems]) => {
            const result = await createShopifyFulfillment(
              creds,
              orderGid,
              lineItems,
            );
            if (!result.ok) {
              shopifyErrors.push(...result.errors);
              console.error(
                `[receive] Shopify fulfillment failed for order ${orderGid}:`,
                result.errors,
              );
            }
          }),
        );
      }
    }

    return NextResponse.json({
      ok: true,
      status: newStatus,
      ...(shopifyErrors.length > 0 ? { shopifyWarnings: shopifyErrors } : {}),
    });
  } catch (err: unknown) {
    return toApiErrorResponse(
      err,
      'PATCH /api/purchase-orders/[id]/receive error:',
    );
  }
}
