-- Store variant unit cost on synced Shopify line items (inbox Cost column).
ALTER TABLE "order"."shopify_order_line_items" ADD COLUMN "unit_cost" DECIMAL(14,2);
