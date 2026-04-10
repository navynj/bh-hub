-- CreateTable
CREATE TABLE "dashboard"."revenue_annual_goals" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "calendar_year" INTEGER NOT NULL,
    "goal_amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_annual_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard"."revenue_month_targets" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "applies_year_month" TEXT NOT NULL,
    "ref_year_month" TEXT NOT NULL,
    "shares_json" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_month_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "revenue_annual_goals_location_id_calendar_year_key" ON "dashboard"."revenue_annual_goals"("location_id", "calendar_year");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_month_targets_location_id_applies_year_month_key" ON "dashboard"."revenue_month_targets"("location_id", "applies_year_month");

-- AddForeignKey
ALTER TABLE "dashboard"."revenue_annual_goals" ADD CONSTRAINT "revenue_annual_goals_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard"."revenue_month_targets" ADD CONSTRAINT "revenue_month_targets_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate annual goals (one row per location; calendar year from ref month or current year)
INSERT INTO "dashboard"."revenue_annual_goals" ("id", "location_id", "calendar_year", "goal_amount", "created_at", "updated_at")
SELECT
    gen_random_uuid()::TEXT,
    l."id",
    CASE
        WHEN l."revenue_target_ref_year_month" ~ '^[0-9]{4}-[0-9]{2}$'
        THEN SUBSTRING(l."revenue_target_ref_year_month", 1, 4)::INTEGER
        ELSE EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER
    END,
    l."annual_revenue_goal",
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM "public"."locations" l
WHERE l."annual_revenue_goal" IS NOT NULL;

-- Migrate month targets: seed all 12 months of the ref year so any dashboard month in that year resolves
INSERT INTO "dashboard"."revenue_month_targets" (
    "id",
    "location_id",
    "applies_year_month",
    "ref_year_month",
    "shares_json",
    "computed_at",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::TEXT,
    l."id",
    SUBSTRING(l."revenue_target_ref_year_month", 1, 4) || '-' || LPAD(m.m::TEXT, 2, '0'),
    l."revenue_target_ref_year_month",
    l."revenue_target_shares_json",
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM "public"."locations" l
CROSS JOIN generate_series(1, 12) AS m(m)
WHERE l."revenue_target_shares_json" IS NOT NULL
  AND TRIM(l."revenue_target_shares_json") <> ''
  AND l."revenue_target_ref_year_month" ~ '^[0-9]{4}-[0-9]{2}$';

-- AlterTable (drop legacy columns on locations)
ALTER TABLE "public"."locations" DROP COLUMN IF EXISTS "annual_revenue_goal";
ALTER TABLE "public"."locations" DROP COLUMN IF EXISTS "revenue_target_ref_year_month";
ALTER TABLE "public"."locations" DROP COLUMN IF EXISTS "revenue_target_shares_json";
