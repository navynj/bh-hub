/**
 * Idempotent import of Shopify Auto Purchase Orders CSV export into
 * `order.purchase_orders` + `order.purchase_order_line_items`.
 *
 * Usage:
 *   pnpm import:po -- /path/to/purchase_orders_export.csv
 *
 * Requires DATABASE_URL. Run `pnpm db:push` (or migrate) before importing.
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { parse as parseDf, isValid } from 'date-fns';
import { parse } from 'csv-parse/sync';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/core/prisma';

type CsvRow = Record<string, string>;

function emptyToNull(s: string | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

function yn(s: string | undefined): boolean {
  return s?.trim().toLowerCase() === 'yes';
}

function parseMoney(raw: string | undefined): Prisma.Decimal | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.replace(/[$,\s]/g, '').replace(/^[−-]/, '-');
  const n = Number.parseFloat(cleaned);
  if (Number.isNaN(n)) return null;
  return new Prisma.Decimal(n);
}

function parseIntOrNull(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw.replace(/,/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

function parseExportDate(s: string | undefined): Date | null {
  const t = s?.trim();
  if (!t) return null;
  for (const fmt of ['MMMM dd, yyyy', 'MMMM d, yyyy']) {
    const d = parseDf(t, fmt, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

function parseExportDateTime(s: string | undefined): Date | null {
  const t = s?.trim();
  if (!t) return null;
  for (const fmt of [
    'MMMM dd, yyyy HH:mm',
    'MMMM d, yyyy HH:mm',
    'MMMM dd, yyyy h:mm a',
    'MMMM d, yyyy h:mm a',
  ]) {
    const d = parseDf(t, fmt, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

function billingJson(row: CsvRow): Prisma.InputJsonValue {
  return {
    company: emptyToNull(row['Billing address Company']),
    contactName: emptyToNull(row['Billing address Contact name']),
    city: emptyToNull(row['Billing address City']),
    country: emptyToNull(row['Billing address Country']),
    countryCode: emptyToNull(row['Billing address Country code']),
    phone: emptyToNull(row['Billing address Phone']),
    addressLine1: emptyToNull(row['Billing address Address line 1']),
    addressLine2: emptyToNull(row['Billing address Address line 2']),
    region: emptyToNull(row['Billing address Region']),
    postalCode: emptyToNull(row['Billing address Postal code']),
  };
}

function shippingJson(row: CsvRow): Prisma.InputJsonValue {
  return {
    company: emptyToNull(row['Shipping address Company']),
    contactName: emptyToNull(row['Shipping address Contact name']),
    city: emptyToNull(row['Shipping address City']),
    country: emptyToNull(row['Shipping address Country']),
    countryCode: emptyToNull(row['Shipping address Country code']),
    phone: emptyToNull(row['Shipping address Phone']),
    addressLine1: emptyToNull(row['Shipping address Address line 1']),
    addressLine2: emptyToNull(row['Shipping address Address line 2']),
    region: emptyToNull(row['Shipping address Region']),
    postalCode: emptyToNull(row['Shipping address Postal code']),
  };
}

function headerPayload(row: CsvRow) {
  const legacyExternalId = parseIntOrNull(row['ID']);
  if (legacyExternalId === null) {
    throw new Error(`Missing or invalid ID: ${row['ID']}`);
  }

  return {
    legacyExternalId,
    poNumber: row['PO number']?.trim() ?? String(legacyExternalId),
    status: row['Status']?.trim() ?? 'unknown',
    currency: row['Currency']?.trim() ?? 'USD',
    isAuto: yn(row['Is Auto']),
    displayTaxColumn: yn(row['Display tax column']),
    comment: emptyToNull(row['Comment']),
    authorizedBy: emptyToNull(row['Authorized by']),
    unitsOrdered: parseIntOrNull(row['Units Ordered']),
    dateCreated: parseExportDate(row['Date created']),
    expectedDate: parseExportDate(row['Expected date']),
    subtotalPrice: parseMoney(row['Subtotal price']),
    discount: parseMoney(row['Discount']),
    discountReason: emptyToNull(row['Discount reason']),
    shippingHandlingPrice: parseMoney(row['Shipping and handling price']),
    totalTaxPrice: parseMoney(row['Total tax price']),
    totalPrice: parseMoney(row['Total price']),
    sourceCreatedAt: parseExportDateTime(row['Created at']),
    sourceUpdatedAt: parseExportDateTime(row['Updated at']),
    completedAt: parseExportDateTime(row['Completed at']),
    supplierExternalId: parseIntOrNull(row['Supplier ID']),
    supplierCompany: emptyToNull(row['Supplier company']),
    supplierContactName: emptyToNull(row['Supplier contact name']),
  };
}

const UNKNOWN_SHOPIFY_ORDER = '(unknown)';

function contactAndAddressesFromRow(row: CsvRow) {
  return {
    customerPhone: emptyToNull(row['Shopify Order Customer phone']),
    customerEmail: emptyToNull(row['Shopify Order Customer email']),
    billingAddress: billingJson(row),
    shippingAddress: shippingJson(row),
  };
}

/**
 * One link per distinct `Shopify Order #` in the PO (combined orders).
 * Contact/address are taken from the first CSV row seen for that order number.
 * If no order # appears anywhere, a single row uses `(unknown)` and `group[0]` for contact/address.
 */
function buildShopifyOrderLinksFromGroup(group: CsvRow[]) {
  const byOrderNum = new Map<string, CsvRow>();
  for (const row of group) {
    const num = row['Shopify Order #']?.trim();
    if (num && !byOrderNum.has(num)) {
      byOrderNum.set(num, row);
    }
  }

  if (byOrderNum.size === 0 && group.length > 0) {
    return [
      {
        orderNumber: UNKNOWN_SHOPIFY_ORDER,
        ...contactAndAddressesFromRow(group[0]),
      },
    ];
  }

  return [...byOrderNum.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([orderNumber, row]) => ({
      orderNumber,
      ...contactAndAddressesFromRow(row),
    }));
}

function linePayload(row: CsvRow, sequence: number) {
  return {
    legacyLineExternalId: parseIntOrNull(row['Product ID']),
    sequence,
    quantity: parseIntOrNull(row['Product Quantity']) ?? 0,
    quantityReceived: parseIntOrNull(row['Product Received']) ?? 0,
    supplierRef: emptyToNull(row['Product Supplier ref']),
    taxPercent: parseMoney(row['Product Tax percent']),
    sku: emptyToNull(row['Product SKU']),
    variantTitle: emptyToNull(row['Product Variant title']),
    productTitle: emptyToNull(row['Product title']),
    shopifyInventoryItemGid: emptyToNull(row['Product Shopify InventoryItemID']),
    shopifyVariantGid: emptyToNull(row['Product Shopify VariantID']),
    shopifyProductGid: emptyToNull(row['Product Shopify ProductID']),
    isCustom: yn(row['Product Is custom']),
    itemPrice: parseMoney(row['Product Item price']),
    lineSubtotalPrice: parseMoney(row['Product Subtotal price']),
    lineTotalTaxPrice: parseMoney(row['Product Total tax price']),
    productProperties: emptyToNull(row['Product Properties']),
  };
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error(
      'Usage: pnpm import:po -- /absolute/path/to/purchase_orders_export.csv',
    );
    process.exit(1);
  }

  const buf = readFileSync(csvPath, 'utf8');
  const rows = parse(buf, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  }) as CsvRow[];

  const byPo = new Map<number, CsvRow[]>();
  let skippedNoId = 0;
  for (const row of rows) {
    const id = parseIntOrNull(row['ID']);
    if (id === null) {
      skippedNoId += 1;
      continue;
    }
    const list = byPo.get(id) ?? [];
    list.push(row);
    byPo.set(id, list);
  }

  if (skippedNoId > 0) {
    console.warn(`Skipped ${skippedNoId} rows with missing/invalid ID.`);
  }

  console.log(`Parsed ${rows.length} CSV rows, ${byPo.size} purchase orders.`);

  let done = 0;
  for (const [, group] of byPo) {
    const first = group[0];
    const header = headerPayload(first);

    await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.upsert({
        where: { legacyExternalId: header.legacyExternalId },
        create: header,
        update: {
          poNumber: header.poNumber,
          status: header.status,
          currency: header.currency,
          isAuto: header.isAuto,
          displayTaxColumn: header.displayTaxColumn,
          comment: header.comment,
          authorizedBy: header.authorizedBy,
          unitsOrdered: header.unitsOrdered,
          dateCreated: header.dateCreated,
          expectedDate: header.expectedDate,
          subtotalPrice: header.subtotalPrice,
          discount: header.discount,
          discountReason: header.discountReason,
          shippingHandlingPrice: header.shippingHandlingPrice,
          totalTaxPrice: header.totalTaxPrice,
          totalPrice: header.totalPrice,
          sourceCreatedAt: header.sourceCreatedAt,
          sourceUpdatedAt: header.sourceUpdatedAt,
          completedAt: header.completedAt,
          supplierExternalId: header.supplierExternalId,
          supplierCompany: header.supplierCompany,
          supplierContactName: header.supplierContactName,
        },
      });

      await tx.purchaseOrderLineItem.deleteMany({
        where: { purchaseOrderId: po.id },
      });

      await tx.purchaseOrderShopifyOrder.deleteMany({
        where: { purchaseOrderId: po.id },
      });

      const shopifyLinks = buildShopifyOrderLinksFromGroup(group);
      if (shopifyLinks.length > 0) {
        await tx.purchaseOrderShopifyOrder.createMany({
          data: shopifyLinks.map((link) => ({
            purchaseOrderId: po.id,
            ...link,
          })),
        });
      }

      const lines = group.map((r, sequence) => ({
        ...linePayload(r, sequence),
        purchaseOrderId: po.id,
      }));

      await tx.purchaseOrderLineItem.createMany({ data: lines });
    });

    done += 1;
    if (done % 500 === 0) {
      console.log(`Imported ${done} / ${byPo.size} POs…`);
    }
  }

  console.log(`Done. Upserted ${byPo.size} purchase orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
