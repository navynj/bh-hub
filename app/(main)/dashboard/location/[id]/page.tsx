import { QB_REFRESH_EXPIRED } from '@/constants/error';
import { getBudgetByLocationAndMonth } from '@/features/dashboard/budget';
import BudgetCard from '@/features/dashboard/budget/components/card/BudgetCard';
import { prisma } from '@/lib/core';
import { getCurrentYearMonth } from '@/lib/utils';
import { turborepoTraceAccess } from 'next/dist/build/turborepo-access-trace';

const LocationPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const yearMonth = getCurrentYearMonth();
  const budget = await getBudgetByLocationAndMonth(id, yearMonth);

  return (
    <div className="flex gap-4">
      {budget ? (
        <BudgetCard
          budget={budget}
          isOfficeOrAdmin={false}
          yearMonth={yearMonth}
          needsReconnect={budget.error === QB_REFRESH_EXPIRED}
        />
      ) : (
        <div className="text-muted-foreground">
          No budget for this location this month.
          <br />
          Please contact to the administrator.
        </div>
      )}
    </div>
  );
};

export default LocationPage;
