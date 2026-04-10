export type RevenueTargetSharesPayload = {
  buckets: Record<string, number>;
  /**
   * Calendar days with at least one Clover sale per bucket key.
   * μ = buckets[key] / bucketActiveDayCounts[key] (excludes zero-sales days from denominator).
   */
  bucketActiveDayCounts?: Record<string, number>;
  /**
   * All calendar days in the reference window per bucket key (used as fallback for
   * old payloads that predate `bucketActiveDayCounts`).
   */
  bucketDayCounts?: Record<string, number>;
  /** Sum of payment cents in the lookback window. */
  totalCents: number;
  computedAt: string;
  appliesYearMonth: string;
  referencePeriodMonths: number;
  /** @deprecated Older cached payloads only */
  refYearMonth?: string;
};
