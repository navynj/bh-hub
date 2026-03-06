/**
 * GET /api/delivery/driver/[id]/tracking?date=YYYY-MM-DD
 * Auth: office/admin (session). Returns driver's current location, today's stops, and GPS path for the day.
 */

import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!getOfficeOrAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: driverId } = await params;
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  if (!dateStr) {
    return NextResponse.json(
      { error: 'Query param date is required (YYYY-MM-DD)' },
      { status: 400 },
    );
  }
  const dateOnly = new Date(dateStr + 'Z');
  if (Number.isNaN(dateOnly.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, name: true, userId: true },
  });
  if (!driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  }

  const startOfDay = new Date(dateOnly);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(dateOnly);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const [stops, locationUpdates, currentLocation] = await Promise.all([
    prisma.dailyScheduleStop.findMany({
      where: { date: dateOnly, driverId },
      orderBy: { sequence: 'asc' },
      select: {
        id: true,
        sequence: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        arrivedAt: true,
        departedAt: true,
      },
    }),
    prisma.driverLocationUpdate.findMany({
      where: {
        driverId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { createdAt: 'asc' },
      select: { lat: true, lng: true, createdAt: true },
    }),
    prisma.driverLocationUpdate.findFirst({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      select: { lat: true, lng: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    driver: { id: driver.id, name: driver.name },
    date: dateStr,
    currentLocation: currentLocation
      ? {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          updatedAt: currentLocation.createdAt,
        }
      : null,
    stops,
    path: locationUpdates.map((p) => ({ lat: p.lat, lng: p.lng, createdAt: p.createdAt })),
  });
}
