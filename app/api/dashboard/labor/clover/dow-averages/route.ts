// GET /api/dashboard/labor/clover/dow-averages?locationId=&yearMonth=YYYY-MM
// Returns per-DOW average Clover net sales for the calendar month before yearMonth.

import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/core/errors';
import { isValidYearMonth } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';
import { getCloverDowAverages } from '@/features/dashboard/labor/utils/get-clover-dow-averages';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const yearMonth = searchParams.get('yearMonth') ?? '';

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 });
    }
    if (!isValidYearMonth(yearMonth)) {
      return NextResponse.json({ error: 'yearMonth must be YYYY-MM' }, { status: 400 });
    }

    const isOfficeOrAdmin = getOfficeOrAdmin(session.user.role);
    const managerLocationId = session.user.locationId ?? undefined;
    if (!isOfficeOrAdmin && managerLocationId !== locationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const data = await getCloverDowAverages(locationId, yearMonth);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return toApiErrorResponse(err, 'GET /api/dashboard/labor/clover/dow-averages error:');
  }
}
