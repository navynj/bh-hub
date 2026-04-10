-- AlterTable: add address fields to shopify_customers
ALTER TABLE "order"."shopify_customers"
  ADD COLUMN "shipping_address" JSONB,
  ADD COLUMN "billing_address" JSONB,
  ADD COLUMN "billing_same_as_shipping" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: add address fields to purchase_orders
ALTER TABLE "order"."purchase_orders"
  ADD COLUMN "shipping_address" JSONB,
  ADD COLUMN "billing_address" JSONB,
  ADD COLUMN "billing_same_as_shipping" BOOLEAN NOT NULL DEFAULT true;
