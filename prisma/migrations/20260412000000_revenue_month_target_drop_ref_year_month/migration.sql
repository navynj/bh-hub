-- Drop redundant ref_year_month column; reference_period_months default → 12
ALTER TABLE "dashboard"."revenue_month_targets" DROP COLUMN IF EXISTS "ref_year_month";
ALTER TABLE "dashboard"."revenue_month_targets" ALTER COLUMN "reference_period_months" SET DEFAULT 12;
