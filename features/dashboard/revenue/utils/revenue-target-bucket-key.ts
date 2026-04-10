import {
  getCloverReportTimeZone,
  zonedWeekdaySun0ForIsoDate,
} from '@/lib/clover/report-timezone';
import { isBcPublicHoliday } from './revenue-target-holidays';
export function revenueBucketKeyForIsoDate(isoDate: string): string {
  const tz = getCloverReportTimeZone();
  const dow = zonedWeekdaySun0ForIsoDate(isoDate, tz);
  const holiday = isBcPublicHoliday(isoDate);
  const prefix = holiday ? 'H' : 'N';
  return `${prefix}-${dow}`;
}
