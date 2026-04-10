import { NextRequest, NextResponse } from 'next/server';
import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { toApiErrorResponse } from '@/lib/core/errors';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !getOfficeOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Office or admin access required' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { purchaseOrderIds, shopifyOrderIds, archive } = body as {
      purchaseOrderIds?: string[];
      shopifyOrderIds?: string[];
      archive: boolean;
    };

    if (!purchaseOrderIds?.length && !shopifyOrderIds?.length) {
      return NextResponse.json(
        { error: 'At least one of purchaseOrderIds or shopifyOrderIds required' },
        { status: 400 },
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      if (purchaseOrderIds?.length) {
        await tx.purchaseOrder.updateMany({
          where: { id: { in: purchaseOrderIds } },
          data: { archivedAt: archive ? now : null },
        });
      }
      if (shopifyOrderIds?.length) {
        await tx.shopifyOrder.updateMany({
          where: { id: { in: shopifyOrderIds } },
          data: { archivedAt: archive ? now : null },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return toApiErrorResponse(err, 'POST /api/archive error:');
  }
}
