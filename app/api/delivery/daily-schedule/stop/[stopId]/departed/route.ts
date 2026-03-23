/**
 * PATCH /api/delivery/daily-schedule/stop/[stopId]/departed
 * Auth: Bearer driver JWT. Sets departedAt = now for the stop.
 */

import {
  emitDeliveryRealtimeEvent,
  scheduleDateToUtcDayString,
} from '@/lib/delivery/emit-delivery-realtime';
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
    select: { id: true, driverId: true, date: true },
  });
  if (!stop) {
    return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
  }

  const updated = await prisma.dailyScheduleStop.update({
    where: { id: stopId },
    data: { departedAt: new Date() },
    select: { id: true, departedAt: true },
  });
  emitDeliveryRealtimeEvent({
    type: 'driver_status',
    driverId: stop.driverId,
    date: scheduleDateToUtcDayString(stop.date),
    origin: 'driver',
  });
  return NextResponse.json(updated);
}
