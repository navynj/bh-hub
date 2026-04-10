-- AlterTable
ALTER TABLE "public"."locations" ADD COLUMN IF NOT EXISTS "annual_revenue_goal" DECIMAL(14,2);
ALTER TABLE "public"."locations" ADD COLUMN IF NOT EXISTS "revenue_target_ref_year_month" TEXT;
ALTER TABLE "public"."locations" ADD COLUMN IF NOT EXISTS "revenue_target_shares_json" TEXT;
