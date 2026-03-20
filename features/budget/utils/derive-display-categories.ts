import type { BudgetCategoryRow } from '@/features/budget/types';
import {
  getTopLevelCategoriesForCharts,
  getTopLevelCategoryIndex,
  parseCategoryPath,
} from '@/features/report/utils/category';

type CosRow = { categoryId: string; name: string; amount: number };

/**
 * Flat rows for the budget category list. Top-level parents use the same merge as
 * {@link getTopLevelCategoriesForCharts} (donut + bar chart); subcategories still come
 * from the union of current/reference by categoryId.
 *
 * Rows with $0 this month but still shown: QuickBooks drops zero-amount lines from a report, but the other
 * period (reference vs current) may still carry that categoryId, so the union keeps the line at $0 for current.
 */
export function deriveBudgetDisplayCategories(
  currentCosByCategory: CosRow[] | undefined,
  referenceCosByCategory: CosRow[] | undefined,
  totalBudget: number,
  currentCosTotal?: number,
  noReference?: boolean,
): BudgetCategoryRow[] {
  const current = currentCosByCategory ?? [];
  const reference = referenceCosByCategory ?? [];

  const currentMap = new Map(current.map((c) => [c.categoryId, c]));
  const refMap = new Map(reference.map((c) => [c.categoryId, c]));
  const allIds = new Set([...currentMap.keys(), ...refMap.keys()]);

  const refList = [...allIds]
    .map((categoryId) => {
      const cur = currentMap.get(categoryId);
      const ref = refMap.get(categoryId);
      return cur ?? ref!;
    })
    .sort(
      (a, b) =>
        getTopLevelCategoryIndex(a.categoryId) -
        getTopLevelCategoryIndex(b.categoryId),
    );

  if (!refList.length) return [];

  const hasBudget = Number.isFinite(totalBudget) && totalBudget > 0;
  const totalForPercent = hasBudget
    ? totalBudget
    : noReference &&
        Number.isFinite(currentCosTotal) &&
        (currentCosTotal ?? 0) > 0
      ? currentCosTotal!
      : 0;
  const hasPercent = hasBudget || (noReference && totalForPercent > 0);

  const mergedTop = getTopLevelCategoriesForCharts(current, reference);

  const topRows: BudgetCategoryRow[] = mergedTop.map((row) => {
    const amount = Number.isFinite(row.amount) ? row.amount : 0;
    return {
      id: row.categoryId,
      categoryId: row.categoryId,
      name: row.name,
      amount,
      percent: hasPercent ? (amount / totalForPercent) * 100 : null,
    };
  });

  const childRows: BudgetCategoryRow[] = refList
    .filter((ref) => parseCategoryPath(ref.categoryId).length > 1)
    .map((ref) => {
      const direct = currentMap.get(ref.categoryId)?.amount;
      const amount =
        direct != null && Number.isFinite(direct) ? direct : 0;
      return {
        id: ref.categoryId,
        categoryId: ref.categoryId,
        name: ref.name,
        amount,
        percent: hasPercent ? (amount / totalForPercent) * 100 : null,
      };
    });

  return [...topRows, ...childRows].sort(
    (a, b) =>
      getTopLevelCategoryIndex(a.categoryId) -
      getTopLevelCategoryIndex(b.categoryId),
  );
}
