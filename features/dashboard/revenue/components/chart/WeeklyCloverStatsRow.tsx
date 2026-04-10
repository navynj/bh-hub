'use client';

import { cn, formatCurrency } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';

type WeeklyCloverStatsRowProps = {
  totalRevenue: number;
  prevWeekRevenue: number | undefined;
  transactionCount: number | undefined;
  avgTicketSize: number | undefined;
};

function StatCard({
  label,
  value,
  sub,
  subClassName,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  subClassName?: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-lg border bg-muted/30 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
      {sub != null && (
        <span className={cn('flex items-center gap-1 text-xs tabular-nums', subClassName)}>
          {sub}
        </span>
      )}
    </div>
  );
}

export default function WeeklyCloverStatsRow({
  totalRevenue,
  prevWeekRevenue,
  transactionCount,
  avgTicketSize,
}: WeeklyCloverStatsRowProps) {
  let wowNode: React.ReactNode = null;
  let wowClass = 'text-muted-foreground';

  if (prevWeekRevenue != null && prevWeekRevenue > 0) {
    const diff = ((totalRevenue - prevWeekRevenue) / prevWeekRevenue) * 100;
    const sign = diff >= 0 ? '+' : '';
    if (diff >= 0) {
      wowClass = 'text-emerald-600 dark:text-emerald-400';
      wowNode = (
        <>
          <TrendingUp className="size-3 shrink-0" />
          {sign}{diff.toFixed(1)}% vs last week
        </>
      );
    } else {
      wowClass = 'text-rose-500 dark:text-rose-400';
      wowNode = (
        <>
          <TrendingDown className="size-3 shrink-0" />
          {sign}{diff.toFixed(1)}% vs last week
        </>
      );
    }
  } else if (prevWeekRevenue === 0 && totalRevenue > 0) {
    wowNode = 'New this week';
    wowClass = 'text-muted-foreground';
  }

  const hasSubStats =
    transactionCount != null || (avgTicketSize != null && avgTicketSize > 0);

  return (
    <div className="flex flex-col gap-2">
      <StatCard
        label="Weekly Sales"
        value={formatCurrency(totalRevenue)}
        sub={wowNode}
        subClassName={wowClass}
      />
      {hasSubStats && (
        <div className="flex gap-2">
          {transactionCount != null && (
            <StatCard
              label="Transactions"
              value={transactionCount.toLocaleString()}
            />
          )}
          {avgTicketSize != null && avgTicketSize > 0 && (
            <StatCard
              label="Avg Ticket"
              value={formatCurrency(avgTicketSize)}
            />
          )}
        </div>
      )}
    </div>
  );
}
