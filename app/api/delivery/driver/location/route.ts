/**
 * POST /api/delivery/driver/location
 * Auth: Bearer driver JWT. Body: { lat, lng }. Records GPS update for office tracking.
 */

import {
  emitDeliveryRealtimeEvent,
  scheduleDateToUtcDayString,
} from '@/lib/delivery/emit-delivery-realtime';
import { verifyDriverToken } from '@/lib/delivery/driver-auth';
import { parseBody, deliveryDriverLocationPostSchema } from '@/lib/api/schemas';
import { prisma } from '@/lib/core/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const payload = verifyDriverToken(authHeader);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseBody(request, deliveryDriverLocationPostSchema);
  if ('error' in parsed) return parsed.error;
  const { lat, lng } = parsed.data;

  const [locationRow] = await prisma.$transaction([
    prisma.driverLocationUpdate.create({
      data: { driverId: payload.driverId, lat, lng },
      select: { createdAt: true },
    }),
    prisma.driver.update({
      where: { id: payload.driverId },
      data: { locationPingRequestedAt: null },
    }),
  ]);

  emitDeliveryRealtimeEvent({
    type: 'location',
    driverId: payload.driverId,
    date: scheduleDateToUtcDayString(locationRow.createdAt),
    origin: 'driver',
  });

  return NextResponse.json({ ok: true });
}
