import type { RevenuePeriodData } from '../components/types';

/** Attach `dailyTarget` from snapshot map to each Clover week row (ISO date key). */
export function mergeDailyRevenueTargetsIntoWeeklyData(
  data: RevenuePeriodData,
  dailyTargetsByDate: Record<string, number> | undefined,
): RevenuePeriodData {
  if (!dailyTargetsByDate || !data.dailyBars?.length) return data;
  return {
    ...data,
    dailyBars: data.dailyBars.map((row) => ({
      ...row,
      dailyTarget: dailyTargetsByDate[row.date] ?? 0,
    })),
  };
}
