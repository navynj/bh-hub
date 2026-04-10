'use client';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { CHART_COLORS } from '@/constants/color';
import { cn, formatCurrency } from '@/lib/utils';
import { Bar, BarChart, BarStack, XAxis, YAxis } from 'recharts';
import type { RevenueCategoryItem } from '../types';

const REMAINING_KEY = 'revenueRemaining';
const OVER_KEY = 'revenueOver';
/** Match budget donut “Remaining” (TotalBudgetChart). */
const REMAINING_FILL = 'var(--muted-background)';
const OVER_FILL = 'var(--primary)';

type RevenueShareBarChartProps = {
  categories: RevenueCategoryItem[];
  /** QuickBooks month total vs this target → remaining / over segments. */
  monthlyRevenueTarget?: number;
  className?: string;
};

function segmentKey(index: number): string {
  return `seg_${index}`;
}

/**
 * Sort key for QB income categories.
 * Group 0 (first): names starting with "Sales" (numeric sub-sort by first number found).
 * Group 2 (last):  names starting with "Remaining".
 * Group 1 (middle): everything else.
 * Handles "Sales 01", "Sales 01 - Food", "Remaining Revenue", etc.
 */
function categorySortKey(name: string): [number, number, string] {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('remaining')) return [2, 0, lower];
  if (/^sales/i.test(trimmed)) {
    const n = /(\d+)/.exec(trimmed);
    return [0, n ? parseInt(n[1]!, 10) : 0, lower];
  }
  return [1, 0, lower];
}

function sortCategories(cats: RevenueCategoryItem[]): RevenueCategoryItem[] {
  return [...cats].sort((a, b) => {
    const [ag, an, as_] = categorySortKey(a.name);
    const [bg, bn, bs] = categorySortKey(b.name);
    if (ag !== bg) return ag - bg;
    if (an !== bn) return an - bn;
    return as_.localeCompare(bs);
  });
}

export default function RevenueShareBarChart({
  categories,
  monthlyRevenueTarget,
  className,
}: RevenueShareBarChartProps) {
  const sorted = sortCategories(categories);
  // Actual net total (includes negative categories like Refunds & Discount).
  // Used only for the under/over target business-logic check.
  const total = sorted.reduce((s, c) => s + c.amount, 0);
  const M = monthlyRevenueTarget;
  const hasTarget = M != null && Number.isFinite(M) && M > 0;

  // Only render positive-amount segments in the stacked bar.
  // Negative amounts (e.g. Refunds & Discount) can't be stacked horizontally without
  // visual artifacts: d3-stack renders them going left, which displaces subsequent
  // segments (including REMAINING_KEY) to the wrong visual position.
  const segments = sorted
    .filter((c) => c.amount > 0)
    .map((c, index) => ({
      key: segmentKey(index),
      name: c.name,
      amount: c.amount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  // Sum of the segments actually rendered. Used for bar-chart domain and remaining/over
  // calculations so the bar always fits exactly within [0, barMax].
  const positiveTotal = segments.reduce((s, c) => s + c.amount, 0);

  if (segments.length === 0 && !(hasTarget && positiveTotal <= 0)) {
    return (
      <div
        className={cn(
          'text-muted-foreground flex min-h-[3.5rem] items-center justify-center rounded-lg border border-dashed text-sm px-4',
          className,
        )}
      >
        No data for this period.
      </div>
    );
  }

  const chartRow: Record<string, string | number> = { y: 'mix' };
  const chartConfig: ChartConfig = {};

  if (hasTarget && positiveTotal <= 0) {
    chartRow[REMAINING_KEY] = M!;
    chartConfig[REMAINING_KEY] = {
      label: 'Remaining to target',
      color: REMAINING_FILL,
    };
  } else if (hasTarget && total <= M!) {
    // Under target (net). Use positiveTotal for bar geometry so there's no overflow.
    for (const s of segments) {
      chartRow[s.key] = s.amount;
      chartConfig[s.key] = { label: s.name, color: s.color };
    }
    chartRow[REMAINING_KEY] = Math.max(0, M! - positiveTotal);
    chartConfig[REMAINING_KEY] = {
      label: 'Remaining to target',
      color: REMAINING_FILL,
    };
  } else if (hasTarget && total > M!) {
    // Over target (net). Scale positive segments to fill M; append Over on the right.
    const scale = M! / positiveTotal;
    for (const s of segments) {
      chartRow[s.key] = s.amount * scale;
      chartRow[`__orig_${s.key}`] = s.amount;
      chartConfig[s.key] = { label: s.name, color: s.color };
    }
    chartRow[OVER_KEY] = positiveTotal - M!;
    chartConfig[OVER_KEY] = { label: 'Over target', color: OVER_FILL };
  } else {
    for (const s of segments) {
      chartRow[s.key] = s.amount;
      chartConfig[s.key] = { label: s.name, color: s.color };
    }
  }

  const chartData = [chartRow];
  const barMax =
    hasTarget && M! > 0 ? Math.max(positiveTotal, M!) : Math.max(positiveTotal, 1);
  const tooltipDenom = hasTarget && M! > 0 ? Math.max(positiveTotal, M!) : positiveTotal;

  /** Explicit stack order: actuals first, then Remaining or Over on the outside (right for horizontal bar). */
  const segmentKeyList = segments.map((s) => s.key);
  const stackKeys: string[] = (() => {
    if (hasTarget && positiveTotal <= 0) return [REMAINING_KEY];
    if (hasTarget && total <= M!) return [...segmentKeyList, REMAINING_KEY];
    if (hasTarget && total > M!) return [...segmentKeyList, OVER_KEY];
    return [...segmentKeyList];
  })();

  const underTarget = hasTarget && total <= M!;
  const overTarget = hasTarget && total > M!;

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
    <ChartContainer
      config={chartConfig}
      className={cn(
        'h-14 w-full max-w-none aspect-auto min-h-14 min-w-0',
        hasTarget && 'min-h-[3.25rem]',
      )}
    >
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        barCategoryGap={0}
      >
        <XAxis type="number" domain={[0, barMax]} hide />
        <YAxis type="category" dataKey="y" width={0} hide />
        <ChartTooltip
          cursor={{ fill: 'rgba(0, 0, 0, 0.06)' }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => {
                const raw = item as {
                  dataKey?: string | number;
                  payload?: Record<string, unknown>;
                };
                const dataKey = String(raw.dataKey ?? '');
                const payload = raw.payload as Record<string, unknown> | undefined;
                const orig =
                  dataKey !== REMAINING_KEY && dataKey !== OVER_KEY
                    ? payload?.[`__orig_${dataKey}`]
                    : undefined;
                const amount = Number(
                  typeof orig === 'number'
                    ? orig
                    : (value ?? payload?.[dataKey] ?? 0),
                );
                const seg = segments.find((s) => s.key === dataKey);
                let label = seg?.name ?? dataKey;
                if (dataKey === REMAINING_KEY) label = 'Remaining to target';
                if (dataKey === OVER_KEY) label = 'Over target';
                const fillColor =
                  dataKey === REMAINING_KEY
                    ? REMAINING_FILL
                    : dataKey === OVER_KEY
                      ? OVER_FILL
                      : seg?.color ?? 'var(--muted)';
                const stackVal = Number(value ?? payload?.[dataKey] ?? 0);
                const pct =
                  tooltipDenom > 0 ? (stackVal / tooltipDenom) * 100 : 0;
                return (
                  <>
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: fillColor }}
                      />
                      <span>{label}</span>
                    </span>
                    <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
                      {formatCurrency(amount)}
                      <span className="text-muted-foreground ml-1 text-[11px]">
                        ({pct.toFixed(1)}%)
                      </span>
                    </span>
                  </>
                );
              }}
            />
          }
        />
        <BarStack stackId="revenue" radius={6}>
          {stackKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          ))}
        </BarStack>
      </BarChart>
    </ChartContainer>
      {hasTarget && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {underTarget && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: REMAINING_FILL }}
              />
              Remaining to target
            </span>
          )}
          {overTarget && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: OVER_FILL }}
              />
              Over target
            </span>
          )}
        </div>
      )}
    </div>
  );
}
