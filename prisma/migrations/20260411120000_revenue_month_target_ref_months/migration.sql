-- AlterTable
ALTER TABLE "dashboard"."revenue_month_targets" ADD COLUMN IF NOT EXISTS "reference_period_months" INTEGER NOT NULL DEFAULT 6;
