-- Add archivedAt column to purchase_orders and shopify_orders
ALTER TABLE "order"."shopify_orders" ADD COLUMN "archived_at" TIMESTAMPTZ;
ALTER TABLE "order"."purchase_orders" ADD COLUMN "archived_at" TIMESTAMPTZ;
