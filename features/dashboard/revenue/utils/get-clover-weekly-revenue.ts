import {
  fetchCloverCategories,
  fetchCloverItemIdsByCategory,
  findSeasonalCategory,
} from '@/lib/clover/fetch-categories';
import { fetchCloverOrderItemsInRange } from '@/lib/clover/fetch-orders';
import { fetchCloverPaymentsInRange } from '@/lib/clover/fetch-payments';
import {
  getCloverReportTimeZone,
  zonedCalendarDay,
  zonedHour,
  zonedWeekdayShort,
} from '@/lib/clover/report-timezone';
import { prisma } from '@/lib/core/prisma';
import { eachDayOfInterval } from 'date-fns';
import type {
  CloverDayHourlyStat,
  CloverMenuItemStat,
  RevenuePeriodData,
} from '../components/types';
import { weekRangeForMonth } from './week-range';

const EMPTY_SEGMENT_KEY = '_clover_empty';
const EMPTY_SEGMENT_LABEL = 'Clover sales';

function weekRowsForInterval(
  weekStart: Date,
  weekEnd: Date,
  timeZone: string,
): { date: string; label: string }[] {
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  return days.map((day) => {
    const ms = day.getTime();
    return {
      date: zonedCalendarDay(ms, timeZone),
      label: zonedWeekdayShort(ms, timeZone),
    };
  });
}

function emptyWeekBars(
  weekStart: Date,
  weekEnd: Date,
  flags?: Pick<RevenuePeriodData, 'cloverNotConfigured' | 'cloverError'>,
): RevenuePeriodData {
  const tz = getCloverReportTimeZone();
  const rows = weekRowsForInterval(weekStart, weekEnd, tz);
  return {
    totalRevenue: 0,
    categories: [],
    dailyBars: rows.map((row) => ({
      ...row,
      segments: { [EMPTY_SEGMENT_KEY]: 0 },
      total: 0,
    })),
    dailyBarSegmentKeys: [EMPTY_SEGMENT_KEY],
    dailyBarSegmentLabels: [EMPTY_SEGMENT_LABEL],
    ...flags,
  };
}

/** Build top/bottom 10 menu item stats from raw line items. */
function buildMenuStats(
  lineItems: Awaited<ReturnType<typeof fetchCloverOrderItemsInRange>>,
  weekTotalRevenue: number,
  seasonalItemIds: Set<string>,
): {
  topMenuItems: CloverMenuItemStat[];
  bottomMenuItems: CloverMenuItemStat[];
  seasonalMenuItems: CloverMenuItemStat[];
} {
  const statsMap = new Map<
    string,
    { itemId: string | null; name: string; quantity: number; revenueCents: number }
  >();

  for (const li of lineItems) {
    const key = li.itemId ?? li.name;
    const existing = statsMap.get(key) ?? {
      itemId: li.itemId,
      name: li.name,
      quantity: 0,
      revenueCents: 0,
    };
    existing.quantity += li.quantity;
    existing.revenueCents += li.priceCents * li.quantity;
    statsMap.set(key, existing);
  }

  const allItems: CloverMenuItemStat[] = [...statsMap.values()]
    .filter((s) => s.quantity > 0)
    .map((s) => ({
      itemId: s.itemId,
      name: s.name,
      quantity: Math.round(s.quantity * 10) / 10,
      revenue: s.revenueCents / 100,
      revenuePercent:
        weekTotalRevenue > 0
          ? (s.revenueCents / 100 / weekTotalRevenue) * 100
          : 0,
    }));

  const byRevenueDesc = [...allItems].sort((a, b) => b.revenue - a.revenue);
  const byRevenueAsc = [...allItems]
    .filter((i) => i.revenue > 0)
    .sort((a, b) => a.revenue - b.revenue);

  const topMenuItems = byRevenueDesc.slice(0, 10);
  const bottomMenuItems = byRevenueAsc.slice(0, 10);

  const seasonalMenuItems =
    seasonalItemIds.size > 0
      ? byRevenueDesc.filter(
          (i) => i.itemId !== null && seasonalItemIds.has(i.itemId),
        )
      : [];

  return { topMenuItems, bottomMenuItems, seasonalMenuItems };
}

/** Build per-day-per-hour revenue data from payments. */
function buildDayHourlySales(
  payments: Awaited<ReturnType<typeof fetchCloverPaymentsInRange>>,
  weekStart: Date,
  weekEnd: Date,
  timeZone: string,
): CloverDayHourlyStat[] {
  const rows = weekRowsForInterval(weekStart, weekEnd, timeZone);
  const dayKeys = new Set(rows.map((r) => r.date));

  // { date → { hour → { revenue, count } } }
  const map = new Map<string, Map<number, { revenue: number; count: number }>>();
  for (const r of rows) {
    map.set(r.date, new Map());
  }

  for (const p of payments) {
    if (p.createdTime == null) continue;
    const dk = zonedCalendarDay(p.createdTime, timeZone);
    if (!dayKeys.has(dk)) continue;
    const hour = zonedHour(p.createdTime, timeZone);
    const dayMap = map.get(dk)!;
    const existing = dayMap.get(hour) ?? { revenue: 0, count: 0 };
    dayMap.set(hour, {
      revenue: existing.revenue + (p.amount ?? 0) / 100,
      count: existing.count + 1,
    });
  }

  const result: CloverDayHourlyStat[] = [];
  for (const [date, hourMap] of map) {
    for (const [hour, stats] of hourMap) {
      result.push({ date, hour, revenue: stats.revenue, transactionCount: stats.count });
    }
  }
  return result;
}

/**
 * Weekly Clover sales from the Clover Payments + Orders APIs (not QuickBooks P&L).
 */
export async function getCloverWeeklyRevenueData(
  locationId: string,
  yearMonth: string,
  weekOffset: number,
): Promise<RevenuePeriodData> {
  const { weekStart, weekEnd } = weekRangeForMonth(yearMonth, weekOffset);

  let locationRecord: {
    cloverToken: string | null;
    cloverMerchantId: string | null;
  } | null = null;
  try {
    locationRecord = await prisma.location.findUnique({
      where: { id: locationId },
      select: { cloverToken: true, cloverMerchantId: true },
    });
  } catch (err) {
    return emptyWeekBars(weekStart, weekEnd, {
      cloverError: err instanceof Error ? err.message : 'Database error',
    });
  }

  const token = locationRecord?.cloverToken?.trim() || null;
  const merchantId = locationRecord?.cloverMerchantId?.trim() || null;

  if (!token || !merchantId) {
    return emptyWeekBars(weekStart, weekEnd, { cloverNotConfigured: true });
  }

  const startMs = weekStart.getTime();
  const endMs = weekEnd.getTime();

  // Previous week range for WoW comparison
  const prevRange = weekRangeForMonth(yearMonth, weekOffset - 1);
  const prevStartMs = prevRange.weekStart.getTime();
  const prevEndMs = prevRange.weekEnd.getTime();

  // Sequential Clover calls — parallel bursts were triggering 429 Too Many Requests.
  let payments: Awaited<ReturnType<typeof fetchCloverPaymentsInRange>>;
  let prevPayments: Awaited<ReturnType<typeof fetchCloverPaymentsInRange>>;
  let orderItems: Awaited<ReturnType<typeof fetchCloverOrderItemsInRange>>;
  let categories: Awaited<ReturnType<typeof fetchCloverCategories>>;

  try {
    payments = await fetchCloverPaymentsInRange(merchantId, token, startMs, endMs);
    prevPayments = await fetchCloverPaymentsInRange(
      merchantId,
      token,
      prevStartMs,
      prevEndMs,
    );
    orderItems = await fetchCloverOrderItemsInRange(merchantId, token, startMs, endMs);
    categories = await fetchCloverCategories(merchantId, token);
  } catch (err) {
    return emptyWeekBars(weekStart, weekEnd, {
      cloverError: err instanceof Error ? err.message : 'Clover API error',
    });
  }

  // Seasonal item IDs (if a matching category exists)
  let seasonalItemIds = new Set<string>();
  const seasonalCategory = findSeasonalCategory(categories);
  if (seasonalCategory) {
    try {
      const ids = await fetchCloverItemIdsByCategory(merchantId, token, seasonalCategory.id);
      seasonalItemIds = new Set(ids);
    } catch {
      // Non-fatal: seasonal section just won't appear
    }
  }

  if (payments.length === 0) {
    return emptyWeekBars(weekStart, weekEnd);
  }

  // ── Tender-based daily bars (existing logic) ──────────────────────────────
  const idToLabel = new Map<string, string>();
  for (const p of payments) {
    const tid = p.tender?.id ?? 'unknown';
    const lab = p.tender?.label?.trim() || tid;
    if (!idToLabel.has(tid)) idToLabel.set(tid, lab);
  }

  const segmentKeys = [...idToLabel.keys()].sort((a, b) =>
    (idToLabel.get(a) ?? a).localeCompare(idToLabel.get(b) ?? b),
  );
  const segmentLabels = segmentKeys.map((k) => idToLabel.get(k) ?? k);

  const tz = getCloverReportTimeZone();
  const weekRows = weekRowsForInterval(weekStart, weekEnd, tz);
  const dayKeys = new Set(weekRows.map((r) => r.date));

  const dayTotalsCents = new Map<string, number>();
  const amountByTenderCents = new Map<string, number>();
  const amountByDayAndTender = new Map<string, Map<string, number>>();

  for (const p of payments) {
    const tenderId = p.tender?.id ?? 'unknown';
    const cents = p.amount ?? 0;

    amountByTenderCents.set(
      tenderId,
      (amountByTenderCents.get(tenderId) ?? 0) + cents,
    );

    if (p.createdTime == null) continue;
    const dk = zonedCalendarDay(p.createdTime, tz);
    if (!dayKeys.has(dk)) continue;

    dayTotalsCents.set(dk, (dayTotalsCents.get(dk) ?? 0) + cents);

    let m = amountByDayAndTender.get(dk);
    if (!m) {
      m = new Map();
      amountByDayAndTender.set(dk, m);
    }
    m.set(tenderId, (m.get(tenderId) ?? 0) + cents);
  }

  const weekTotalCents = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const weekTotalRevenue = weekTotalCents / 100;
  const prevWeekRevenue =
    prevPayments.reduce((s, p) => s + (p.amount ?? 0), 0) / 100;

  const categories_tender = segmentKeys.map((id) => ({
    id,
    name: idToLabel.get(id) ?? id,
    amount: (amountByTenderCents.get(id) ?? 0) / 100,
  }));

  const dailyBars = weekRows.map(({ date: key, label }) => {
    const perTender = amountByDayAndTender.get(key) ?? new Map();
    const segments: Record<string, number> = Object.fromEntries(
      segmentKeys.map((id) => [id, (perTender.get(id) ?? 0) / 100]),
    );
    return {
      label,
      date: key,
      segments,
      total: (dayTotalsCents.get(key) ?? 0) / 100,
    };
  });

  // ── Enhanced stats ────────────────────────────────────────────────────────
  const transactionCount = payments.length;
  const avgTicketSize = transactionCount > 0 ? weekTotalRevenue / transactionCount : 0;

  const { topMenuItems, bottomMenuItems, seasonalMenuItems } = buildMenuStats(
    orderItems,
    weekTotalRevenue,
    seasonalItemIds,
  );

  const dayHourlySales = buildDayHourlySales(payments, weekStart, weekEnd, tz);

  return {
    totalRevenue: weekTotalRevenue,
    categories: categories_tender,
    dailyBars,
    dailyBarSegmentKeys: segmentKeys,
    dailyBarSegmentLabels: segmentLabels,
    transactionCount,
    avgTicketSize,
    prevWeekRevenue,
    topMenuItems,
    bottomMenuItems,
    seasonalMenuItems: seasonalMenuItems.length > 0 ? seasonalMenuItems : undefined,
    dayHourlySales,
  };
}
