// GET /api/dashboard/revenue/clover?locationId=&yearMonth=YYYY-MM&weekOffset=0

import { getCloverWeeklyRevenueData } from '@/features/dashboard/revenue/utils/get-clover-weekly-revenue';
import { weekRangeForMonth } from '@/features/dashboard/revenue/utils/week-range';
import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/core/errors';
import { getCurrentYearMonth, isValidYearMonth } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const yearMonth = searchParams.get('yearMonth') || getCurrentYearMonth();
    const weekOffsetRaw = searchParams.get('weekOffset');

    if (!locationId) {
      return NextResponse.json(
        { error: 'locationId is required' },
        { status: 400 },
      );
    }

    if (!isValidYearMonth(yearMonth)) {
      return NextResponse.json(
        { error: 'Invalid yearMonth; use YYYY-MM' },
        { status: 400 },
      );
    }

    const isOfficeOrAdmin = getOfficeOrAdmin(session.user.role);
    const managerLocationId = session.user.locationId ?? undefined;
    if (!isOfficeOrAdmin && managerLocationId !== locationId) {
      return NextResponse.json(
        { error: 'You can only view revenue for your own location' },
        { status: 403 },
      );
    }

    const weekOffset =
      weekOffsetRaw != null && weekOffsetRaw !== ''
        ? Number.parseInt(weekOffsetRaw, 10)
        : 0;
    if (!Number.isFinite(weekOffset)) {
      return NextResponse.json(
        { error: 'weekOffset must be an integer' },
        { status: 400 },
      );
    }

    const data = await getCloverWeeklyRevenueData(
      locationId,
      yearMonth,
      weekOffset,
    );

    const range = weekRangeForMonth(yearMonth, weekOffset);

    return NextResponse.json({
      ok: true,
      yearMonth,
      weekOffset,
      startDate: range.startDate,
      endDate: range.endDate,
      data,
    });
  } catch (err: unknown) {
    return toApiErrorResponse(err, 'GET /api/dashboard/revenue/clover error:');
  }
}
