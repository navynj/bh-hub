import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { parseBody, deliveryDriverPostSchema } from '@/lib/api/schemas';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!getOfficeOrAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const list = await prisma.driver.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });
  const rows = list.map((d) => ({
    id: d.id,
    userId: d.userId,
    name: d.user?.name ?? null,
    createdAt: d.createdAt,
  }));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!getOfficeOrAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = await parseBody(request, deliveryDriverPostSchema);
  if ('error' in parsed) return parsed.error;
  const { userId } = parsed.data;

  const created = await prisma.driver.create({
    data: { userId },
    select: { id: true },
  });
  return NextResponse.json(created, { status: 201 });
}
