/**
 * PATCH /api/delivery/daily-schedule/stop/[stopId]/arrived
 * Auth: Bearer driver JWT. Sets arrivedAt = now for the stop (if owned by this driver).
 */

import { verifyDriverToken } from '@/lib/delivery/driver-auth';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ stopId: string }> },
) {
  const authHeader = _request.headers.get('authorization');
  const payload = verifyDriverToken(authHeader);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { stopId } = await params;
  const stop = await prisma.dailyScheduleStop.findFirst({
    where: { id: stopId, driverId: payload.driverId },
    select: { id: true },
  });
  if (!stop) {
    return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
  }

  const updated = await prisma.dailyScheduleStop.update({
    where: { id: stopId },
    data: { arrivedAt: new Date() },
    select: { id: true, arrivedAt: true },
  });
  return NextResponse.json(updated);
}
