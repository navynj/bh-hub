'use client';

import ChartPieDonutText from '@/components/chart/DonutChart';
import type { ChartConfig } from '@/components/ui/chart';
import { CHART_COLORS } from '@/constants/color';
import { formatCurrency } from '@/lib/utils';
import type { LaborCategoryItem } from '../../types';

const REMAINING_KEY = 'Remaining to target';
const OVER_KEY = 'Over target';

const REMAINING_FILL = 'var(--muted)';
const OVER_FILL = 'var(--destructive)';

type LaborChartProps = {
  categories: LaborCategoryItem[];
  className?: string;
  /** Expense D section total from P&L; used for slice % so chart matches Total Labor. */
  totalLabor?: number;
  /** Labor budget target; when set, shows gray Remaining (under) or red Over (above). */
  targetLabor?: number;
};

export default function LaborChart({
  categories,
  className,
  totalLabor,
  targetLabor,
}: LaborChartProps) {
  const sumCategories = categories.reduce((s, c) => s + c.amount, 0);
  const actualTotal =
    totalLabor != null && totalLabor > 0
      ? totalLabor
      : sumCategories > 0
        ? sumCategories
        : 0;

  const hasTarget =
    targetLabor != null && Number.isFinite(targetLabor) && targetLabor > 0;
  const underOrOnTarget = hasTarget && actualTotal <= targetLabor;
  const overTarget = hasTarget && actualTotal > targetLabor;

  /** Pie slice values (Recharts normalizes by sum). Tooltip uses displayAmount / displayShare. */
  type SliceRow = {
    category: string;
    amount: number;
    fill: string;
    displayAmount: number;
    displayShare: number;
  };

  let chartData: SliceRow[] = [];

  if (hasTarget && underOrOnTarget) {
    const remaining = Math.max(0, targetLabor - actualTotal);
    chartData = categories.map((c, index) => ({
      category: c.name,
      amount: c.amount,
      fill: CHART_COLORS[index % CHART_COLORS.length],
      displayAmount: c.amount,
      displayShare:
        targetLabor > 0 ? (c.amount / targetLabor) * 100 : 0,
    }));
    if (remaining > 0) {
      chartData.push({
        category: REMAINING_KEY,
        amount: remaining,
        fill: REMAINING_FILL,
        displayAmount: remaining,
        displayShare:
          targetLabor > 0 ? (remaining / targetLabor) * 100 : 0,
      });
    }
  } else if (hasTarget && overTarget) {
    const overAmt = actualTotal - targetLabor;
    const scale = actualTotal > 0 ? targetLabor / actualTotal : 0;
    chartData = categories.map((c, index) => ({
      category: c.name,
      amount: c.amount * scale,
      fill: CHART_COLORS[index % CHART_COLORS.length],
      displayAmount: c.amount,
      displayShare: actualTotal > 0 ? (c.amount / actualTotal) * 100 : 0,
    }));
    if (overAmt > 0) {
      chartData.push({
        category: OVER_KEY,
        amount: overAmt,
        fill: OVER_FILL,
        displayAmount: overAmt,
        displayShare: actualTotal > 0 ? (overAmt / actualTotal) * 100 : 0,
      });
    }
  } else {
    const denom = actualTotal > 0 ? actualTotal : sumCategories > 0 ? sumCategories : 1;
    chartData = categories.map((c, index) => ({
      category: c.name,
      amount: c.amount,
      fill: CHART_COLORS[index % CHART_COLORS.length],
      displayAmount: c.amount,
      displayShare: (c.amount / denom) * 100,
    }));
  }

  const hasAny =
    actualTotal > 0 ||
    sumCategories > 0 ||
    (hasTarget && underOrOnTarget && targetLabor > 0 && actualTotal === 0);

  if (chartData.length === 0 || !hasAny) {
    return (
      <div
        className={`text-muted-foreground flex min-h-[180px] items-center justify-center rounded-lg border border-dashed text-sm ${className ?? ''}`}
      >
        No labor data for this period.
      </div>
    );
  }

  const chartConfig: ChartConfig = categories.reduce<ChartConfig>(
    (acc, c, index) => {
      acc[c.name] = {
        label: c.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
      return acc;
    },
    {},
  );
  chartConfig[REMAINING_KEY] = {
    label: REMAINING_KEY,
    color: REMAINING_FILL,
  };
  chartConfig[OVER_KEY] = {
    label: OVER_KEY,
    color: OVER_FILL,
  };

  return (
    <ChartPieDonutText
      className={className ?? 'max-h-[220px]'}
      strokeWidth={5}
      innerRadius={44}
      chartData={chartData}
      dataKey="amount"
      nameKey="category"
      chartConfig={chartConfig}
      tooltipFormatter={(value, name, payload) => {
        const displayAmount = Number(
          payload.displayAmount ?? payload.amount ?? value ?? 0,
        );
        const percent = Number(payload.displayShare ?? 0);
        const fillColor =
          typeof payload.fill === 'string' ? payload.fill : 'var(--muted)';
        return (
          <>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: fillColor }}
              />
              <span>{name}</span>
            </span>
            <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
              {formatCurrency(displayAmount)}
              <span className="text-muted-foreground ml-1 text-[11px]">
                ({percent.toFixed(2)}%)
              </span>
            </span>
          </>
        );
      }}
    />
  );
}
