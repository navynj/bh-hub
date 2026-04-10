/** Pacific — hardcoded so Clover daily/hourly buckets match BC store time (not server UTC). */
export const CLOVER_REPORT_TIMEZONE = 'America/Vancouver' as const;

export function getCloverReportTimeZone(): string {
  return CLOVER_REPORT_TIMEZONE;
}

export function zonedCalendarDay(utcMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(utcMs));
}

export function zonedHour(utcMs: number, timeZone: string): number {
  const hourPart = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  })
    .formatToParts(new Date(utcMs))
    .find((p) => p.type === 'hour')?.value;
  const h = Number.parseInt(hourPart ?? '0', 10);
  return Number.isFinite(h) ? h : 0;
}

export function zonedWeekdayShort(utcMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  })
    .format(new Date(utcMs))
    .toUpperCase()
    .slice(0, 3);
}
