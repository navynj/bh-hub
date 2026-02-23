import { prisma } from '@/lib/core/prisma';

export async function updateCostTags(
  costId: string,
  tagIds: string[]
): Promise<void> {
  await prisma.costTag.deleteMany({
    where: { costId },
  });
  if (tagIds.length > 0) {
    await prisma.costTag.createMany({
      data: tagIds.map((tagId) => ({ costId, tagId })),
      skipDuplicates: true,
    });
  }
}

export async function fetchCostTagsWithDetails(costId: string) {
  return prisma.costTag.findMany({
    where: { costId },
    include: { Tag: true },
  });
}
