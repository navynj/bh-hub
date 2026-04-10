// GET /api/dashboard/labor/prev-month-summary?locationId=&yearMonth=YYYY-MM
// Returns previous month's QB labor breakdown for LaborTimeNeeded calculation.

import { type QuickBooksApiContext } from '@/features/dashboard/budget';
import { getLaborDashboardData } from '@/features/dashboard/labor';
import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/core/errors';
import { isValidYearMonth } from '@/lib/utils';
import { format, parseISO, subMonths } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

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

    const prevYearMonth = format(subMonths(parseISO(`${yearMonth}-01`), 1), 'yyyy-MM');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const context: QuickBooksApiContext = {
      baseUrl,
      cookie: request.headers.get('cookie'),
    };

    const labor = await getLaborDashboardData(locationId, prevYearMonth, context, {
      referenceIncomeTotal: undefined,
      laborTarget: null,
    });

    const managementFeeMonthly =
      labor.categories.find((c) => c.id === 'management-fee')?.amount ?? 0;
    const insuranceMonthly =
      labor.categories.find((c) => c.id === 'health-benefits')?.amount ?? 0;

    return NextResponse.json({
      ok: true,
      refYearMonth: prevYearMonth,
      totalLabor: labor.totalLabor,
      managementFeeMonthly,
      insuranceMonthly,
    });
  } catch (err) {
    return toApiErrorResponse(err, 'GET /api/dashboard/labor/prev-month-summary error:');
  }
}
