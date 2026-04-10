/**
 * Backfill `vendor` on existing ShopifyOrderLineItem rows by re-fetching
 * orders from Shopify, and seed ShopifyVendorMapping from existing
 * Supplier.shopifyVendorName values.
 *
 * Usage:
 *   npx tsx scripts/resync-vendor-field.ts
 */

import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/core/prisma';
import { fetchAllShopifyOrders } from '../lib/shopify/fetchOrders';
import { getShopifyAdminEnv } from '../lib/shopify/env';

const BATCH_SIZE = 500;

async function backfillVendorField() {
  const creds = getShopifyAdminEnv();
  console.log(`[resync-vendor] Fetching all Shopify orders from ${creds.shopDomain}…`);

  const { orders, pagesFetched } = await fetchAllShopifyOrders(creds, {
    pageSize: 250,
    maxPages: 200,
  });

  console.log(`[resync-vendor] Fetched ${orders.length} orders across ${pagesFetched} page(s).`);

  // Collect GIDs already done for resumability
  const alreadyDone = new Set(
    (
      await prisma.shopifyOrderLineItem.findMany({
        where: { vendor: { not: null } },
        select: { shopifyGid: true },
      })
    ).map((r) => r.shopifyGid),
  );
  console.log(`[resync-vendor] ${alreadyDone.size} line items already have vendor — will skip.`);

  // Build list of pending updates
  const pending: { gid: string; vendor: string }[] = [];
  for (const order of orders) {
    for (const edge of order.lineItems.edges) {
      const li = edge.node;
      if (alreadyDone.has(li.id)) continue;
      if (li.vendor) {
        pending.push({ gid: li.id, vendor: li.vendor });
      }
    }
  }

  console.log(`[resync-vendor] ${pending.length} line items to update in batches of ${BATCH_SIZE}.`);

  let updated = 0;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);

    // Build a single UPDATE ... SET vendor = CASE ... END WHERE shopify_gid IN (...)
    const whenClauses = batch
      .map((item) => `WHEN ${Prisma.raw(`'${item.gid.replace(/'/g, "''")}'`).strings[0]} THEN ${Prisma.raw(`'${item.vendor.replace(/'/g, "''")}'`).strings[0]}`)
      .join(' ');
    const gids = batch.map((item) => item.gid.replace(/'/g, "''"));
    const inList = gids.map((g) => `'${g}'`).join(',');

    await prisma.$executeRawUnsafe(
      `UPDATE "order"."shopify_order_line_items" SET vendor = CASE shopify_gid ${whenClauses} END WHERE shopify_gid IN (${inList})`,
    );

    updated += batch.length;
    console.log(`[resync-vendor]   batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updated}/${pending.length} updated`);
  }

  console.log(`[resync-vendor] Done. Updated ${updated} line items (${alreadyDone.size} already had vendor).`);
}

async function seedVendorMappings() {
  const suppliers = await prisma.supplier.findMany({
    where: { shopifyVendorName: { not: null } },
    select: { id: true, shopifyVendorName: true, company: true },
  });

  console.log(`[resync-vendor] Seeding vendor mappings from ${suppliers.length} suppliers with shopifyVendorName…`);

  let created = 0;
  for (const supplier of suppliers) {
    if (!supplier.shopifyVendorName) continue;

    const existing = await prisma.shopifyVendorMapping.findUnique({
      where: { vendorName: supplier.shopifyVendorName },
    });

    if (existing) {
      if (existing.supplierId !== supplier.id) {
        console.warn(
          `[resync-vendor] WARNING: vendor "${supplier.shopifyVendorName}" already mapped to supplier ${existing.supplierId}, skipping ${supplier.company} (${supplier.id})`,
        );
      }
      continue;
    }

    await prisma.shopifyVendorMapping.create({
      data: {
        vendorName: supplier.shopifyVendorName,
        supplierId: supplier.id,
      },
    });
    created++;
  }

  console.log(`[resync-vendor] Created ${created} vendor mappings.`);
}

async function reportUnmappedVendors() {
  const allVendors = await prisma.shopifyOrderLineItem.findMany({
    where: { vendor: { not: null } },
    select: { vendor: true },
    distinct: ['vendor'],
  });

  const mappings = await prisma.shopifyVendorMapping.findMany({
    select: { vendorName: true },
  });

  const mappedSet = new Set(mappings.map((m) => m.vendorName));
  const unmapped = allVendors
    .map((v) => v.vendor!)
    .filter((name) => !mappedSet.has(name));

  if (unmapped.length > 0) {
    console.log(`[resync-vendor] ${unmapped.length} unmapped vendor name(s):`);
    for (const name of unmapped.sort()) {
      console.log(`  - "${name}"`);
    }
    console.log('[resync-vendor] Map these via the Supplier settings UI or manually in the DB.');
  } else {
    console.log('[resync-vendor] All vendor names are mapped to suppliers.');
  }
}

async function main() {
  await backfillVendorField();
  await seedVendorMappings();
  await reportUnmappedVendors();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
