/**
 * Labor dashboard: P&L **Expense D** lines rolled into five labor buckets.
 */

import type { QuickBooksApiContext } from '@/features/dashboard/budget';
import { referenceCurrentMonthRange } from '@/features/dashboard/budget';
import { fetchPnlReport } from '@/lib/quickbooks/client';
import {
  parseExpenseDLineItemsFromReportRows,
  parseExpenseDTotalFromReportRows,
} from '@/lib/quickbooks/parser';
import type { LaborTargetRow } from './labor-target-repository';
import { resolveLaborTarget } from './compute-labor-target';
import type { LaborDashboardData, LaborLineDetail } from '../types';

/** Fixed display order (matches product). Indices must match classifyExpenseDLineToLaborIndex. */
export const LABOR_CATEGORY_DEF = [
  { id: 'management-fee', name: 'Management Fee' },
  { id: 'health-benefits', name: 'Health Benefits' },
  { id: 'tax', name: 'Tax' },
  { id: 'wage', name: 'Wage' },
  { id: 'others', name: 'Others' },
] as const;

/** Merge duplicate QB names (same leaf label repeated) and sort by amount desc. */
function mergeLaborLines(
  rows: LaborLineDetail[],
): LaborLineDetail[] {
  const m = new Map<string, number>();
  for (const { name, amount } of rows) {
    m.set(name, (m.get(name) ?? 0) + amount);
  }
  return Array.from(m.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

/**
 * Map a P&L labor line (account name) into one of five categories (0–4).
 * Order: management → tax → health → wage (explicit) → others (remainder).
 */
export function classifyExpenseDLineToLaborIndex(name: string): number {
  const n = name.toLowerCase();
  // 0 — Management Fee
  if (
    /management|mgmt\s*fee|^m\/e\b|admin\s*fee|\bmanagers?\b|wage\s*\d*-\s*manager|wages-\s*manager/i.test(
      n,
    )
  )
    return 0;
  // 2 — Tax (before health: EI/CPP vs benefit insurance)
  if (
    /\btax\b|\btaxes\b|payroll\s*taxes?|fica|suta|futa|withhold|federal\s+with|state\s+with|\bwcb\b|\beht\b|cpp\b|\bei\b|employment\s+insurance|ei\s*contrib|e\s*&\s*e\b/i.test(
      n,
    )
  )
    return 2;
  // 1 — Health (benefit / medical; no bare "insurance" so e.g. Group Insurance → remainder)
  if (
    /health|benefit|401|medical|dental|vision|hmo|welfare|pto\s*acc/i.test(n)
  )
    return 1;
  // 3 — Wage (typical payroll / hourly; subcontract in path e.g. "D - Subcontractors / …")
  if (
    /\bwages?\b|barista|kitchen|staffs|subcontract|salary|hourly|payroll\s*expense|l\d+\s*-\s*|hq\s+barista|main\s+staffs|staff(?!\s+training)|labor|compensation|overtime|commission|tips\b|bonus(?!\s*pool)|\bpayroll\b(?!\s*tax)/i.test(
      n,
    )
  )
    return 3;
  // 4 — Others: anything that did not match the four rules above
  return 4;
}

export async function getLaborDashboardData(
  locationId: string,
  yearMonth: string,
  context: QuickBooksApiContext,
  opts: {
    referenceIncomeTotal?: number;
    laborTarget: LaborTargetRow | null;
  },
): Promise<LaborDashboardData> {
  const { startDate, endDate } = referenceCurrentMonthRange(yearMonth);
  const { report } = await fetchPnlReport(
    context.baseUrl,
    context.cookie,
    locationId,
    startDate,
    endDate,
    'Accrual',
  );
  const lines = parseExpenseDLineItemsFromReportRows(report?.Rows);
  const sums = [0, 0, 0, 0, 0];
  const bucketLines: LaborLineDetail[][] = [[], [], [], [], []];
  for (const line of lines) {
    const idx = classifyExpenseDLineToLaborIndex(line.name);
    sums[idx] += line.amount;
    bucketLines[idx].push({ name: line.name, amount: line.amount });
  }
  const categories = LABOR_CATEGORY_DEF.map((def, i) => ({
    id: def.id,
    name: def.name,
    amount: sums[i],
    lines:
      bucketLines[i].length > 0 ? mergeLaborLines(bucketLines[i]) : undefined,
  }));
  const totalLabor = parseExpenseDTotalFromReportRows(report?.Rows);
  const laborTarget =
    opts.laborTarget != null
      ? {
          rate: opts.laborTarget.rate,
          referencePeriodMonths: opts.laborTarget.referencePeriodMonths,
        }
      : null;

  const {
    targetLabor,
    displayRate,
    displayPeriod,
    referenceIncomeTotal,
  } = resolveLaborTarget({
    referenceIncomeTotal: opts.referenceIncomeTotal,
    laborTarget,
  });
  return {
    totalLabor,
    targetLabor,
    displayRate,
    displayPeriod,
    referenceIncomeTotal,
    categories,
  };
}
