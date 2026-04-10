import { NextResponse } from 'next/server';
import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !getOfficeOrAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const agg = await prisma.shopifyOrder.aggregate({
    _max: { syncedAt: true },
    _count: { id: true },
  });

  return NextResponse.json({
    lastSyncedAt: agg._max.syncedAt?.toISOString() ?? null,
    totalOrders: agg._count.id,
  });
}
