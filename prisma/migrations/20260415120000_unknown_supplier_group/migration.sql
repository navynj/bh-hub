-- Default group for suppliers that are not assigned to Internal / External / etc.
INSERT INTO "order"."supplier_groups" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
SELECT 'cmunknownsuppliergrp001', 'Unknown Supplier', 'unknown-supplier', 10, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "order"."supplier_groups" WHERE "slug" = 'unknown-supplier'
);

UPDATE "order"."suppliers" AS s
SET "group_id" = g."id"
FROM "order"."supplier_groups" AS g
WHERE g."slug" = 'unknown-supplier'
  AND s."group_id" IS NULL;
