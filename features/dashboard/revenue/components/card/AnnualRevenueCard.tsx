'use client';

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import RevenueShareBarChart from '../chart/RevenueShareBarChart';
import SetAnnualRevenueGoalDialog from '../SetAnnualRevenueGoalDialog';
import type { RevenuePeriodData } from '../types';

type AnnualRevenueCardProps = {
  data: RevenuePeriodData;
  annualGoal?: number;
  locationId: string;
  appliesYearMonth: string;
  showUpdateTarget?: boolean;
  className?: string;
};

export default function AnnualRevenueCard({
  data,
  annualGoal,
  locationId,
  appliesYearMonth,
  showUpdateTarget,
  className,
}: AnnualRevenueCardProps) {
  const year = appliesYearMonth.slice(0, 4);

  return (
    <Card className={cn('min-w-0 gap-2', className)}>
      <CardHeader className="space-y-1 pb-2">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base font-bold">
              Annual Revenue {year}
            </CardTitle>
          </div>
        </div>
        <CardAction className="flex w-full max-w-full flex-col gap-3 sm:w-auto sm:items-end">
          {showUpdateTarget ? (
            <SetAnnualRevenueGoalDialog
              locationId={locationId}
              appliesYearMonth={appliesYearMonth}
              label="Update target"
              initialGoal={annualGoal}
            />
          ) : null}
          <span className="text-right text-2xl font-extrabold tabular-nums leading-tight">
            <span className="text-foreground">
              {formatCurrency(data.totalRevenue)}
            </span>
            {annualGoal != null && annualGoal > 0 && (
              <>
                <span className="text-muted-foreground font-normal"> / </span>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {formatCurrency(annualGoal)}
                </span>
              </>
            )}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-0">
        <RevenueShareBarChart
          categories={data.categories}
          monthlyRevenueTarget={annualGoal}
        />
      </CardContent>
    </Card>
  );
}
