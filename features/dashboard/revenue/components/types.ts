export type RevenueCategoryItem = {
  id: string;
  name: string;
  amount: number;
  /** Share of total revenue (0–1); optional if derived from amounts. */
  percent?: number;
};

export type RevenueDailyBarRow = {
  /** Short label e.g. SUN */
  label: string;
  /** ISO date e.g. 2026-04-07 */
  date: string;
  /** Amount per top-level Income line (`dailyBarSegmentKeys` on period data). */
  segments: Record<string, number>;
  /** Sum of segment amounts for footer display */
  total: number;
};

export type CloverMenuItemStat = {
  itemId: string | null;
  name: string;
  quantity: number;
  revenue: number;
  revenuePercent: number;
};

export type CloverDayHourlyStat = {
  /** ISO date e.g. '2026-04-07' */
  date: string;
  /** Hour of day 0–23 */
  hour: number;
  revenue: number;
  transactionCount: number;
};

export type RevenuePeriodData = {
  totalRevenue: number;
  categories: RevenueCategoryItem[];
  /** Weekly only: ordered keys for `dailyBars[].segments` (top-level P&L Income account ids). */
  dailyBarSegmentKeys?: string[];
  /** Same order as `dailyBarSegmentKeys`; Income account labels for legend/tooltip. */
  dailyBarSegmentLabels?: string[];
  /** Weekly only: stacked bars per day */
  dailyBars?: RevenueDailyBarRow[];
  /** True when Clover credentials are not yet configured for this location. */
  cloverNotConfigured?: boolean;
  /** Non-empty when the Clover API returned an error. */
  cloverError?: string;
  /** Number of payment transactions for the week */
  transactionCount?: number;
  /** Average transaction size (totalRevenue / transactionCount) */
  avgTicketSize?: number;
  /** Previous week's total revenue for WoW comparison */
  prevWeekRevenue?: number;
  /** Top 10 items by revenue */
  topMenuItems?: CloverMenuItemStat[];
  /** Bottom 10 items by revenue (among items actually sold) */
  bottomMenuItems?: CloverMenuItemStat[];
  /** Items belonging to the seasonal/special Clover category */
  seasonalMenuItems?: CloverMenuItemStat[];
  /** Per-day, per-hour revenue for heatmap (America/Vancouver) */
  dayHourlySales?: CloverDayHourlyStat[];
};
