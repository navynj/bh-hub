import type { PrismaClient } from '@prisma/client';

/** Catch-all group for suppliers without an explicit assignment. */
export const UNKNOWN_SUPPLIER_GROUP_SLUG = 'unknown-supplier';

/** When the client sends no group (or "none"), assign this group if it exists. */
export async function resolveSupplierGroupId(
  prisma: PrismaClient,
  requested: string | null | undefined,
): Promise<string | null> {
  const trimmed =
    typeof requested === 'string' ? requested.trim() : requested;
  if (trimmed) return trimmed;
  const g = await prisma.supplierGroup.findUnique({
    where: { slug: UNKNOWN_SUPPLIER_GROUP_SLUG },
    select: { id: true },
  });
  return g?.id ?? null;
}
