/**
 * GET /api/delivery/driver/[id]/tracking?date=YYYY-MM-DD
 * Auth: office/admin (session). Returns stops and GPS path only between first-stop arrival and last-stop
 * arrival; live current location is shown only until the driver arrives at the final stop.
 */

import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { resolveDriverDisplayName } from '@/lib/delivery/resolve-driver-display-name';
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
    select: {
      id: true,
      userId: true,
      user: { select: { name: true } },
    },
  });
  if (!driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  }

  const startOfDay = new Date(dateOnly);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(dateOnly);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const [stops, locationUpdates] = await Promise.all([
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
  ]);

  // Tracking window: from first stop arrival until last stop arrival (same calendar day).
  const firstArrivedAt = stops[0]?.arrivedAt ?? null;
  const lastArrivedAt =
    stops.length > 0 ? (stops[stops.length - 1]?.arrivedAt ?? null) : null;

  let pathFiltered = locationUpdates;
  let currentLocation: {
    lat: number;
    lng: number;
    updatedAt: Date;
  } | null = null;

  if (!firstArrivedAt) {
    pathFiltered = [];
  } else {
    const endBound = lastArrivedAt ?? endOfDay;
    pathFiltered = locationUpdates.filter(
      (p) => p.createdAt >= firstArrivedAt && p.createdAt <= endBound,
    );
    if (!lastArrivedAt) {
      const latest = pathFiltered[pathFiltered.length - 1];
      currentLocation = latest
        ? {
            lat: latest.lat,
            lng: latest.lng,
            updatedAt: latest.createdAt,
          }
        : null;
    }
  }

  return NextResponse.json({
    driver: { id: driver.id, name: driver.user?.name ?? null },
    date: dateStr,
    currentLocation: currentLocation
      ? {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          updatedAt: currentLocation.updatedAt.toISOString(),
        }
      : null,
    stops,
    path: pathFiltered.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      createdAt: p.createdAt,
    })),
  });
}
