'use client';

import {
  ChartBarStacked,
  type ChartBarStackedTooltipItem,
} from '@/components/chart/BarStackedChart';
import type { ChartConfig } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';
import { isBcPublicHoliday } from '@/features/dashboard/revenue/utils/revenue-target-holidays';
import type { RevenueDailyBarRow } from '../types';

const REMAINING_KEY = 'revenueRemaining';
const OVER_KEY = 'revenueOver';
const SALES_FILL = 'var(--chart-1)';
const REMAINING_FILL = 'var(--muted-background)';
const OVER_FILL = 'var(--primary)';

type RevenueDailyBarChartProps = {
  rows: RevenueDailyBarRow[];
  /** Top-level category ids; same keys as each `row.segments`. */
  segmentKeys: string[];
  /** Display label per key (same length as `segmentKeys`). */
  segmentLabels: string[];
  className?: string;
};

function augmentRowsForTargets(
  rows: RevenueDailyBarRow[],
  segmentKeys: string[],
): Record<string, unknown>[] {
  return rows.map((r) => {
    const row: Record<string, unknown> = {
      label: r.label,
      date: r.date,
      total: r.total,
    };
    for (const key of segmentKeys) {
      row[key] = r.segments[key] ?? 0;
    }
    const T = r.dailyTarget;
    if (T == null || !Number.isFinite(T) || T <= 0) {
      row[REMAINING_KEY] = 0;
      row[OVER_KEY] = 0;
      return row;
    }
    row.__dailyTarget = T;
    const actualTotal = r.total;
    if (actualTotal <= T) {
      row[REMAINING_KEY] = T - actualTotal;
      row[OVER_KEY] = 0;
      return row;
    }
    const scale = T / actualTotal;
    for (const key of segmentKeys) {
      const raw = Number(r.segments[key] ?? 0);
      row[key] = raw * scale;
      row[`__orig_${key}`] = raw;
    }
    row[REMAINING_KEY] = 0;
    row[OVER_KEY] = actualTotal - T;
    return row;
  });
}

function hasAnyTarget(rows: RevenueDailyBarRow[]): boolean {
  return rows.some(
    (r) => r.dailyTarget != null && Number.isFinite(r.dailyTarget) && r.dailyTarget > 0,
  );
}

/**
 * Ordered segment index from display name (aligns with get-revenue-data segment sort).
 * — "Sales 01 …" / "Sales02…"
 * — "01 - …" style QB names (digit + separator), not bare long years.
 */
function salesOrderFromSegmentLabel(label: string): number | null {
  const t = label.trim();
  const salesPrefix = t.match(/^Sales\s*0*(\d+)/i);
  if (salesPrefix) return parseInt(salesPrefix[1], 10);
  const numThenSep = t.match(/^(\d{1,3})\s*[-–.]/);
  if (numThenSep) return parseInt(numThenSep[1], 10);
  return null;
}

/**
 * Tooltip order: numbered sales lines first (by parsed order), then other segments
 * (e.g. Refunds&Discounts), then Over target, Total, Remaining to target (last).
 */
function sortRevenueDailyTooltipPayload(
  items: ChartBarStackedTooltipItem[],
  chartConfig: ChartConfig,
): ChartBarStackedTooltipItem[] {
  type SortKey = { tier: number; salesOrder: number; label: string };

  const labelFor = (item: ChartBarStackedTooltipItem): string => {
    const dataKey = String(item.dataKey ?? item.name ?? '');
    const cfg = chartConfig[dataKey]?.label;
    if (typeof cfg === 'string') return cfg;
    return String(item.name ?? dataKey);
  };

  const keyFor = (item: ChartBarStackedTooltipItem): SortKey => {
    const dataKey = String(item.dataKey ?? item.name ?? '');
    const label = labelFor(item);

    if (dataKey === REMAINING_KEY) {
      return { tier: 4, salesOrder: 0, label };
    }
    if (dataKey === OVER_KEY) {
      return { tier: 2, salesOrder: 0, label };
    }
    if (dataKey === 'dailyTotal') {
      return { tier: 3, salesOrder: 0, label };
    }

    const ord = salesOrderFromSegmentLabel(label);
    if (ord != null) {
      return { tier: 0, salesOrder: ord, label };
    }
    return { tier: 1, salesOrder: 0, label };
  };

  return [...items].sort((a, b) => {
    const ka = keyFor(a);
    const kb = keyFor(b);
    if (ka.tier !== kb.tier) return ka.tier - kb.tier;
    if (ka.tier === 0 && kb.tier === 0) {
      const d = ka.salesOrder - kb.salesOrder;
      if (d !== 0) return d;
    }
    return ka.label.localeCompare(kb.label, undefined, { numeric: true });
  });
}

function RevenueDailyBarChart({
  rows,
  segmentKeys,
  segmentLabels,
  className,
}: RevenueDailyBarChartProps) {
  const showTarget = hasAnyTarget(rows);

  const chartConfig = useMemo(() => {
    const base = segmentKeys.reduce<ChartConfig>((acc, key, i) => {
      acc[key] = {
        label: segmentLabels[i] ?? key,
        color: SALES_FILL,
      };
      return acc;
    }, {});
    if (showTarget) {
      base[REMAINING_KEY] = {
        label: 'Remaining to target',
        color: REMAINING_FILL,
      };
      base[OVER_KEY] = {
        label: 'Over target',
        color: OVER_FILL,
      };
    }
    return base;
  }, [segmentKeys, segmentLabels, showTarget]);

  const chartData = useMemo(
    () =>
      showTarget
        ? augmentRowsForTargets(rows, segmentKeys)
        : rows.map((r) => {
            const row: Record<string, string | number> = {
              label: r.label,
              date: r.date,
              total: r.total,
            };
            for (const key of segmentKeys) {
              row[key] = r.segments[key] ?? 0;
            }
            return row;
          }),
    [rows, segmentKeys, showTarget],
  );

  const tooltipValueGetter = useMemo(() => {
    if (!showTarget) return undefined;
    return (payload: Record<string, unknown>, dataKey: string) => {
      if (dataKey === REMAINING_KEY || dataKey === OVER_KEY) return undefined;
      const orig = payload[`__orig_${dataKey}`];
      if (typeof orig === 'number') return orig;
      return undefined;
    };
  }, [showTarget]);

  const tooltipExtraRows = useMemo(
    () => (payload: Record<string, unknown>) => {
      const dailyTotal = segmentKeys.reduce((sum, key) => {
        const o = payload[`__orig_${key}`];
        if (typeof o === 'number') return sum + o;
        return sum + Number(payload[key] ?? 0);
      }, 0);
      const overAmt = Number(payload[OVER_KEY] ?? 0);
      const target =
        typeof payload.__dailyTarget === 'number' ? payload.__dailyTarget : 0;
      const totalLabel =
        overAmt > 0 && target > 0
          ? `Total (${formatCurrency(target)} target + ${formatCurrency(overAmt)} over)`
          : 'Total';
      return [
        {
          dataKey: 'dailyTotal',
          name: totalLabel,
          value: dailyTotal,
        },
      ];
    },
    [segmentKeys],
  );

  const stackKeyOrder = useMemo(
    () =>
      showTarget
        ? [...segmentKeys, REMAINING_KEY, OVER_KEY]
        : [...segmentKeys],
    [segmentKeys, showTarget],
  );

  const xAxisTickClassNameByIndex = useMemo(() => {
    const holidayByIndex = rows.map((r) => isBcPublicHoliday(r.date));
    return (index: number) =>
      holidayByIndex[index] ? 'fill-destructive font-medium' : undefined;
  }, [rows]);

  if (segmentKeys.length === 0 || rows.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <ChartBarStacked
        chartData={chartData}
        chartConfig={chartConfig}
        className="aspect-[16/7] min-h-[200px] w-full max-w-none"
        tooltipExtraRows={tooltipExtraRows}
        hideTooltipIndicatorForKeys={['dailyTotal']}
        filterTooltipZero={showTarget}
        tooltipValueGetter={tooltipValueGetter}
        excludeFromLegend={
          showTarget ? [...segmentKeys] : undefined
        }
        stackKeyOrder={stackKeyOrder}
        sortTooltipPayload={sortRevenueDailyTooltipPayload}
        xAxisTickClassNameByIndex={xAxisTickClassNameByIndex}
      />
    </div>
  );
}

export default RevenueDailyBarChart;
