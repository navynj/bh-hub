'use client';

import { ChartContainer } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
} from 'recharts';
import type { ScatterShapeProps } from 'recharts';
import { createContext, useContext } from 'react';
import type { CloverDayHourlyStat } from '../types';

/** Business hours shown: 6am – 11pm local */
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const HOUR_COUNT = HOURS.length;

const X_AXIS_TICKS = [6, 9, 12, 15, 18, 21];

/** Max pixel height for the weekly-per-hour summary bars */
const WEEKLY_BAR_MAX_PX = 100;

function fmtHour(h: number): string {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

/** Emerald-500 heat scale (Tailwind-aligned rgb) */
function heatFill(intensity: number): string {
  if (intensity <= 0) return 'transparent';
  const alpha = (0.08 + intensity * 0.87).toFixed(3);
  return `rgba(16,185,129,${alpha})`;
}

type CellDatum = {
  hour: number;
  dayIndex: number;
  dayLabel: string;
  date: string;
  revenue: number;
  transactionCount: number;
};

const HeatmapMetaContext = createContext({
  maxRevenue: 0,
  rowCount: 1,
  hourCount: HOUR_COUNT,
});

/**
 * Recharts 3: pass shape as a React element (not a bare function) so this stays
 * a proper component and `usePlotArea` works — Customized no longer receives axis maps.
 */
function HeatmapCell(props: Partial<ScatterShapeProps>) {
  const { maxRevenue, rowCount, hourCount } = useContext(HeatmapMetaContext);
  const plot = usePlotArea();
  const cell = (props.payload ?? props) as CellDatum;
  if (props.cx == null || props.cy == null || !plot || rowCount < 1 || hourCount < 1)
    return null;

  const cellW = Math.max(2, plot.width / hourCount - 2.5);
  const cellH = Math.max(2, plot.height / rowCount - 2);
  const intensity = maxRevenue > 0 ? cell.revenue / maxRevenue : 0;

  return (
    <rect
      x={props.cx - cellW / 2}
      y={props.cy - cellH / 2}
      width={cellW}
      height={cellH}
      rx={3}
      fill={heatFill(intensity)}
      stroke="hsl(var(--border))"
      strokeWidth={0.5}
      vectorEffect="non-scaling-stroke"
      style={{ strokeOpacity: 0.35 }}
    />
  );
}

function HeatTooltipBody({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as CellDatum | undefined;
  if (!d || d.revenue === 0) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="font-semibold text-foreground">
        {format(parseISO(d.date), 'EEE, MMM d')} · {fmtHour(d.hour)}
      </p>
      <p className="text-muted-foreground">
        Revenue:{' '}
        <span className="font-medium text-foreground tabular-nums">
          {formatCurrency(d.revenue)}
        </span>
      </p>
      <p className="text-muted-foreground">
        Transactions:{' '}
        <span className="font-medium text-foreground tabular-nums">
          {d.transactionCount}
        </span>
      </p>
    </div>
  );
}

type HourlySalesHeatmapProps = {
  dayHourlySales: CloverDayHourlyStat[];
  weekDates: { date: string; label: string }[];
};

export default function HourlySalesHeatmap({
  dayHourlySales,
  weekDates,
}: HourlySalesHeatmapProps) {
  if (weekDates.length === 0) return null;

  const lookup = new Map<string, Map<number, { revenue: number; count: number }>>();
  for (const row of dayHourlySales) {
    let hm = lookup.get(row.date);
    if (!hm) {
      hm = new Map();
      lookup.set(row.date, hm);
    }
    hm.set(row.hour, { revenue: row.revenue, count: row.transactionCount });
  }

  let maxRevenue = 0;
  for (const { date } of weekDates) {
    const hm = lookup.get(date);
    if (!hm) continue;
    for (const h of HOURS) {
      const v = hm.get(h);
      if (v && v.revenue > maxRevenue) maxRevenue = v.revenue;
    }
  }

  const cells: CellDatum[] = weekDates.flatMap(({ date, label }, dayIndex) =>
    HOURS.map((hour) => {
      const v = lookup.get(date)?.get(hour);
      return {
        hour,
        dayIndex,
        dayLabel: label,
        date,
        revenue: v?.revenue ?? 0,
        transactionCount: v?.count ?? 0,
      };
    }),
  );

  const dayLabels = weekDates.map((d) => d.label);
  const rowCount = weekDates.length;

  const hourTotals = HOURS.map((h) =>
    weekDates.reduce((s, { date }) => s + (lookup.get(date)?.get(h)?.revenue ?? 0), 0),
  );
  const maxHourTotal = Math.max(...hourTotals, 1);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold">Hourly Heatmap</span>
        <span className="text-xs text-muted-foreground">
          Recharts · 6am–11pm (local) · green = higher revenue
        </span>
      </div>

      <HeatmapMetaContext.Provider
        value={{ maxRevenue, rowCount, hourCount: HOUR_COUNT }}
      >
        <ChartContainer
          config={{}}
          className="w-full"
          style={{ height: `${rowCount * 32 + 56}px` }}
        >
          <ScatterChart margin={{ top: 8, right: 4, bottom: 8, left: 32 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.4}
              vertical={false}
            />
            <XAxis
              type="number"
              dataKey="hour"
              domain={[5.5, 23.5]}
              ticks={X_AXIS_TICKS}
              tickFormatter={fmtHour}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="dayIndex"
              domain={[-0.5, rowCount - 0.5]}
              ticks={weekDates.map((_, i) => i)}
              tickFormatter={(i: number) => dayLabels[i] ?? ''}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              reversed
              width={30}
            />
            <Tooltip
              content={HeatTooltipBody}
              cursor={false}
            />
            <Scatter
              data={cells}
              dataKey="hour"
              shape={<HeatmapCell />}
              isAnimationActive={false}
              legendType="none"
            />
          </ScatterChart>
        </ChartContainer>
      </HeatmapMetaContext.Provider>

      <div className="space-y-1 pl-[36px] pr-1">
        <p className="text-[10px] font-medium text-muted-foreground">
          Weekly total per hour (same 6am–11pm window)
        </p>
        <div
          className="flex gap-px border-b border-border/60 pb-0.5"
          style={{ minHeight: WEEKLY_BAR_MAX_PX + 4 }}
        >
          {hourTotals.map((total, i) => {
            const pct = total / maxHourTotal;
            const barH = Math.max(4, Math.round(pct * WEEKLY_BAR_MAX_PX));
            return (
              <div
                key={HOURS[i]}
                className="flex min-w-0 flex-1 flex-col justify-end"
                title={`${fmtHour(HOURS[i])}: ${formatCurrency(total)}`}
              >
                <div
                  className="w-full min-h-[4px] rounded-sm bg-emerald-500/80 dark:bg-emerald-400/70"
                  style={{ height: `${barH}px` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-px pr-0.5">
          {HOURS.map((h) => (
            <div
              key={h}
              className="min-w-0 flex-1 text-center text-[9px] leading-none text-muted-foreground"
            >
              {X_AXIS_TICKS.includes(h) ? fmtHour(h) : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
