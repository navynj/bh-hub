import { computeTotalBudget } from '@/features/dashboard/budget/utils/calculations';

/** Defaults when no LaborTarget row (match product: 25% × 6‑month ref). */
export const DEFAULT_LABOR_RATE = 0.25;
export const DEFAULT_LABOR_REFERENCE_MONTHS = 6;

export type LaborTargetRateInput = {
  rate: number;
  referencePeriodMonths: number;
};

export type LaborTargetResolveInput = {
  referenceIncomeTotal?: number | null;
  /** Saved row; when null, uses DEFAULT_LABOR_RATE / DEFAULT_LABOR_REFERENCE_MONTHS. */
  laborTarget?: LaborTargetRateInput | null;
};

/**
 * Labor target = rate × (reference income total ÷ reference months).
 * Independent of Cost budget.
 */
export function resolveLaborTarget(
  input: LaborTargetResolveInput | null | undefined,
): {
  targetLabor: number;
  displayRate: number;
  displayPeriod: number;
  referenceIncomeTotal: number | null;
} {
  const laborTarget = input?.laborTarget;
  const rate = laborTarget ? laborTarget.rate : DEFAULT_LABOR_RATE;
  const displayPeriod = laborTarget
    ? laborTarget.referencePeriodMonths
    : DEFAULT_LABOR_REFERENCE_MONTHS;

  const refIncome =
    input?.referenceIncomeTotal != null &&
    Number.isFinite(Number(input.referenceIncomeTotal))
      ? Number(input.referenceIncomeTotal)
      : 0;

  const referenceIncomeTotal = refIncome > 0 ? refIncome : null;
  const targetLabor =
    refIncome > 0 ? computeTotalBudget(refIncome, rate, displayPeriod) : 0;

  return {
    targetLabor,
    displayRate: rate,
    displayPeriod,
    referenceIncomeTotal,
  };
}
