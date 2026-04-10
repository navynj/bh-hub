import { addDays, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { isValidYearMonth } from '@/lib/utils';
import {
  getCloverReportTimeZone,
  zonedCalendarDay,
} from '@/lib/clover/report-timezone';
import { prisma } from '@/lib/core/prisma';
import { cloverPaymentNetSalesCents } from '@/lib/clover/payment-net-sales';
import { revenueBucketKeyForIsoDate } from './revenue-target-bucket-key';
import { fetchCloverPaymentsChunked } from './revenue-target-fetch-payments-chunked';
import type { RevenueTargetSharesPayload } from './revenue-target-types';

const MIN_REF_MONTHS = 0;
const MAX_REF_MONTHS = 24;

/**
 * Recompute Clover bucket totals from `referencePeriodMonths` full calendar months
 * immediately before `appliesYearMonth` (applies month excluded), Vancouver dates.
 * **`referencePeriodMonths === 0`**: no mix / no targets — stores empty buckets and does
 * not call Clover (works without merchant credentials).
 */
export async function recomputeRevenueTargetSharesForLocation(
  locationId: string,
  appliesYearMonth: string,
  referencePeriodMonths: number,
): Promise<RevenueTargetSharesPayload> {
  if (!isValidYearMonth(appliesYearMonth)) {
    throw new Error('Invalid appliesYearMonth');
  }
  const n = Math.floor(referencePeriodMonths);
  if (!Number.isFinite(n) || n < MIN_REF_MONTHS || n > MAX_REF_MONTHS) {
    throw new Error(
      `referencePeriodMonths must be between ${MIN_REF_MONTHS} and ${MAX_REF_MONTHS}`,
    );
  }

  const appliesStart = parseISO(`${appliesYearMonth}-01`);
  if (Number.isNaN(appliesStart.getTime())) {
    throw new Error('Invalid appliesYearMonth');
  }

  let buckets: Record<string, number> = {};
  let bucketDayCounts: Record<string, number> = {};
  let bucketActiveDayCounts: Record<string, number> = {};
  let totalCents = 0;

  if (n > 0) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { cloverMerchantId: true, cloverToken: true },
    });
    const merchantId = location?.cloverMerchantId?.trim() || null;
    const token = location?.cloverToken?.trim() || null;
    if (!merchantId || !token) {
      throw new Error('Clover is not configured for this location');
    }

    const windowEnd = endOfMonth(subMonths(appliesStart, 1));
    const windowStart = startOfMonth(subMonths(appliesStart, n));
    const startMs = windowStart.getTime();
    const endMs = windowEnd.getTime();

    const payments = await fetchCloverPaymentsChunked(
      merchantId,
      token,
      startMs,
      endMs,
    );

    const tz = getCloverReportTimeZone();
    // Accumulate net sales per day so we can count days that actually had sales.
    const dayTotals = new Map<string, number>();
    for (const p of payments) {
      if (p.createdTime == null || typeof p.amount !== 'number') continue;
      const day = zonedCalendarDay(p.createdTime, tz);
      const key = revenueBucketKeyForIsoDate(day);
      const cents = cloverPaymentNetSalesCents(p);
      buckets[key] = (buckets[key] ?? 0) + cents;
      totalCents += cents;
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + cents);
    }

    // Active days: only count days that had net sales > 0.
    for (const [day, dayCents] of dayTotals) {
      if (dayCents > 0) {
        const key = revenueBucketKeyForIsoDate(day);
        bucketActiveDayCounts[key] = (bucketActiveDayCounts[key] ?? 0) + 1;
      }
    }

    const startIso = zonedCalendarDay(windowStart.getTime(), tz);
    const endIso = zonedCalendarDay(windowEnd.getTime(), tz);
    for (let cur = parseISO(startIso); ; cur = addDays(cur, 1)) {
      const iso = format(cur, 'yyyy-MM-dd');
      if (iso > endIso) break;
      const key = revenueBucketKeyForIsoDate(iso);
      bucketDayCounts[key] = (bucketDayCounts[key] ?? 0) + 1;
    }
  }

  const payload: RevenueTargetSharesPayload = {
    buckets,
    ...(Object.keys(bucketActiveDayCounts).length > 0 ? { bucketActiveDayCounts } : {}),
    ...(Object.keys(bucketDayCounts).length > 0 ? { bucketDayCounts } : {}),
    totalCents,
    appliesYearMonth,
    referencePeriodMonths: n,
    computedAt: new Date().toISOString(),
  };

  const now = new Date();
  await prisma.revenueMonthTarget.upsert({
    where: {
      locationId_appliesYearMonth: { locationId, appliesYearMonth },
    },
    create: {
      locationId,
      appliesYearMonth,
      referencePeriodMonths: n,
      sharesJson: JSON.stringify(payload),
      computedAt: now,
    },
    update: {
      referencePeriodMonths: n,
      sharesJson: JSON.stringify(payload),
      computedAt: now,
    },
  });

  return payload;
}
