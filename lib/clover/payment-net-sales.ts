/**
 * Clover payment “Net sales” (matches common dashboard usage): total charged minus tax and tip.
 * Amounts are in **cents** (same as Clover API `amount`, `taxAmount`, `tipAmount`).
 */
export type CloverPaymentForNet = {
  amount?: number;
  taxAmount?: number;
  tipAmount?: number;
};

export function cloverPaymentNetSalesCents(p: CloverPaymentForNet): number {
  if (typeof p.amount !== 'number') return 0;
  const tax = typeof p.taxAmount === 'number' ? p.taxAmount : 0;
  const tip = typeof p.tipAmount === 'number' ? p.tipAmount : 0;
  return Math.max(0, p.amount - tax - tip);
}
