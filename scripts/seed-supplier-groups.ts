import 'dotenv/config';
import { prisma } from '../lib/core/prisma';

const DEFAULT_GROUPS = [
  { slug: 'internal', name: 'Internal', sortOrder: 0 },
  { slug: 'external', name: 'External', sortOrder: 1 },
  { slug: 'unknown-supplier', name: 'Unknown Supplier', sortOrder: 10 },
] as const;

async function main() {
  for (const group of DEFAULT_GROUPS) {
    await prisma.supplierGroup.upsert({
      where: { slug: group.slug },
      create: group,
      update: { name: group.name, sortOrder: group.sortOrder },
    });
    console.log(`✓ ${group.name} (${group.slug})`);
  }

  const unknownGroup = await prisma.supplierGroup.findUnique({
    where: { slug: 'unknown-supplier' },
  });
  if (unknownGroup) {
    const { count } = await prisma.supplier.updateMany({
      where: { groupId: null },
      data: { groupId: unknownGroup.id },
    });
    if (count > 0) {
      console.log(`✓ Assigned ${count} ungrouped supplier(s) to Unknown Supplier`);
    }
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
