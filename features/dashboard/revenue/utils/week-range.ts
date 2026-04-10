import {
  addWeeks,
  differenceInCalendarWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfWeek,
} from 'date-fns';
import {
  getCloverReportTimeZone,
  zonedCalendarDay,
} from '@/lib/clover/report-timezone';

/** Sunday (0) through Saturday (6), US-style week — shared with `WeekRangeNav`. */
export const WEEK_STARTS_ON = 0 as const;

/**
 * Parse a YYYY-MM string to a Date at LOCAL midnight on the 1st.
 * Using `new Date(y, m-1, 1)` instead of `parseISO('YYYY-MM-01')` ensures
 * date-fns operations (startOfWeek, endOfMonth, format…) use the correct
 * calendar day in any timezone — including browsers in UTC-7 where
 * parseISO('YYYY-MM-01') resolves to the previous calendar day locally.
 */
function parseYearMonthLocal(yearMonth: string): Date {
  const [y, m] = yearMonth.split('-');
  return new Date(Number(y), Number(m) - 1, 1);
}

/**
 * Parse a YYYY-MM-DD string to a Date at LOCAL midnight.
 * Safe for use in `format()` calls in the browser — avoids the off-by-one
 * day error that occurs when parseISO('YYYY-MM-DD') (UTC midnight) is
 * formatted in a UTC-N timezone.
 */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/**
 * Week offset (from the month’s first-week anchor) for the Sunday–Saturday week that contains `today`,
 * when `today` falls in `yearMonth`; otherwise 0. Safe for server components.
 */
export function getWeekOffsetContainingToday(
  yearMonth: string,
  today = new Date(),
): number {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return 0;
  if (today.getFullYear() !== y || today.getMonth() !== m - 1) return 0;

  const monthStart = parseYearMonthLocal(yearMonth);
  const baseWeekStart = startOfWeek(monthStart, {
    weekStartsOn: WEEK_STARTS_ON,
  });
  const todayWeekStart = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
  return differenceInCalendarWeeks(todayWeekStart, baseWeekStart, {
    weekStartsOn: WEEK_STARTS_ON,
  });
}

export function weekRangeForMonth(
  yearMonth: string,
  weekOffset: number,
): { startDate: string; endDate: string; weekStart: Date; weekEnd: Date } {
  const monthStart = parseYearMonthLocal(yearMonth);
  const baseWeekStart = startOfWeek(monthStart, {
    weekStartsOn: WEEK_STARTS_ON,
  });
  const weekStart = addWeeks(baseWeekStart, weekOffset);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON });
  return {
    weekStart,
    weekEnd,
    startDate: format(weekStart, 'yyyy-MM-dd'),
    endDate: format(weekEnd, 'yyyy-MM-dd'),
  };
}

/**
 * Min/max week offsets (from the month’s first-week anchor) whose Sun–Sat range
 * intersects `yearMonth`’s calendar month.
 */
export function getWeekOffsetsIntersectingMonth(yearMonth: string): {
  min: number;
  max: number;
} {
  const monthStart = parseYearMonthLocal(yearMonth);
  const monthEnd = endOfMonth(monthStart);
  const baseWeekStart = startOfWeek(monthStart, {
    weekStartsOn: WEEK_STARTS_ON,
  });

  let min: number | null = null;
  let max: number | null = null;
  for (let k = -10; k <= 10; k++) {
    const weekStart = addWeeks(baseWeekStart, k);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON });
    if (weekEnd < monthStart || weekStart > monthEnd) continue;
    if (min === null || k < min) min = k;
    if (max === null || k > max) max = k;
  }

  return { min: min ?? 0, max: max ?? 0 };
}

export function weekStartIsoForMonthOffset(
  yearMonth: string,
  weekOffset: number,
): string {
  return weekRangeForMonth(yearMonth, weekOffset).startDate;
}

/** Vancouver calendar day for `now` (YYYY-MM-DD). */
export function zonedTodayIsoForClover(now = new Date()): string {
  return zonedCalendarDay(now.getTime(), getCloverReportTimeZone());
}

/**
 * Whether the Sunday-starting week for `weekOffset` has already begun in Clover TZ
 * (week start date ≤ today).
 */
export function isWeekStartOnOrBeforeToday(
  yearMonth: string,
  weekOffset: number,
  now = new Date(),
): boolean {
  return weekStartIsoForMonthOffset(yearMonth, weekOffset) <= zonedTodayIsoForClover(now);
}

/**
 * Clamp preferred offset to month bounds and drop weeks whose Sunday is still in the future.
 */
export function clampWeekOffsetForDashboard(
  yearMonth: string,
  preferred: number,
  now = new Date(),
): number {
  const { min, max } = getWeekOffsetsIntersectingMonth(yearMonth);
  let o = Math.min(Math.max(preferred, min), max);
  while (o > min && !isWeekStartOnOrBeforeToday(yearMonth, o, now)) {
    o -= 1;
  }
  return o;
}
