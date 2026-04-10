'use client';

import { cn } from '@/lib/utils';
import RevenueChart from '../chart/RevenueChart';
import RevenueSummary from '../chart/RevenueSummary';
import RevenueCategoryList from '../list/RevenueCategoryList';
import type { RevenuePeriodData } from '../types';

type MonthlyRevenueCardProps = {
  data: RevenuePeriodData;
  className?: string;
};

const MonthlyRevenueCard = ({ data, className }: MonthlyRevenueCardProps) => {
  return (
    <div className={cn(className)}>
      <div className="rounded-lg border bg-background/80 p-3 sm:p-4">
        <h2 className="text-base font-bold">Monthly Revenue</h2>
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-4">
            <RevenueSummary totalRevenue={data.totalRevenue} />
            <RevenueChart categories={data.categories} />
          </div>
          <RevenueCategoryList categories={data.categories} />
        </div>
      </div>
    </div>
  );
};

export default MonthlyRevenueCard;
