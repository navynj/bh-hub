import Holidays from 'date-holidays';
import {
  getCloverReportTimeZone,
  zonedNoonInstantMs,
} from '@/lib/clover/report-timezone';

let hd: InstanceType<typeof Holidays> | null = null;

function getBcHolidays(): InstanceType<typeof Holidays> {
  if (!hd) {
    hd = new Holidays('CA', 'BC', {
      timezone: getCloverReportTimeZone(),
    });
  }
  return hd;
}

function holidayProbeAtZonedNoon(isoDate: string): Date {
  return new Date(zonedNoonInstantMs(isoDate, getCloverReportTimeZone()));
}

/** BC statutory (`CA` + `BC` rules); ignore Canada-wide `observance` (e.g. Groundhog Day). */
function isBcStatutoryHolidayEntry(entry: unknown): boolean {
  if (!entry || typeof entry !== 'object') return false;
  return (entry as { type?: string }).type === 'public';
}

/** BC statutory public holiday for calendar date `YYYY-MM-DD` (Vancouver). */
export function isBcPublicHoliday(isoDate: string): boolean {
  const h = getBcHolidays().isHoliday(holidayProbeAtZonedNoon(isoDate));
  if (!Array.isArray(h)) return false;
  return h.some(isBcStatutoryHolidayEntry);
}

function holidayEntryName(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object' && 'name' in entry) {
    return String((entry as { name: string }).name);
  }
  return '';
}

/** Human-readable names for BC statutory holidays on `YYYY-MM-DD` (empty if none). */
export function getBcPublicHolidayLabels(isoDate: string): string[] {
  const h = getBcHolidays().isHoliday(holidayProbeAtZonedNoon(isoDate));
  if (!h || !Array.isArray(h)) return [];
  return h
    .filter(isBcStatutoryHolidayEntry)
    .map(holidayEntryName)
    .filter(Boolean);
}

/** Single string for UI (multiple holidays joined with " · "). */
export function getBcPublicHolidayDisplay(isoDate: string): string | null {
  const labels = getBcPublicHolidayLabels(isoDate);
  if (labels.length === 0) return null;
  return labels.join(' · ');
}
