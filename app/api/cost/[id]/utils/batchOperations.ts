import { prisma } from '@/lib/core/prisma';
import type { Prisma } from '@prisma/client';

type ItemWithId = { id: string; [key: string]: unknown };

function prepareBatchOperations<T extends ItemWithId>(
  prevItems: T[],
  payloadItems: T[] | undefined,
  getItemData: (item: T) => Omit<T, 'id'> & { costId: string }
): {
  toUpdate: Array<{ id: string; data: Omit<T, 'id'> }>;
  toCreate: Array<Omit<T, 'id'> & { costId: string }>;
  toDeleteIds: string[];
} {
  const payloadMap = new Map(
    (payloadItems || []).map((item) => [item.id, item])
  );
  const prevItemIds = new Set(prevItems.map((item) => item.id));

  const toUpdate: Array<{ id: string; data: Omit<T, 'id'> }> = [];
  const toCreate: Array<Omit<T, 'id'> & { costId: string }> = [];
  const toDeleteIds: string[] = [];

  for (const prevItem of prevItems) {
    const payloadItem = payloadMap.get(prevItem.id);
    if (payloadItem) {
      const { id: _, ...itemData } = payloadItem;
      toUpdate.push({ id: prevItem.id, data: itemData as Omit<T, 'id'> });
    } else {
      toDeleteIds.push(prevItem.id);
    }
  }

  for (const payloadItem of payloadItems || []) {
    if (!prevItemIds.has(payloadItem.id)) {
      toCreate.push(getItemData(payloadItem));
    }
  }

  return { toUpdate, toCreate, toDeleteIds };
}

export async function processIngredientsBatch(
  prevItems: ItemWithId[],
  payloadItems: ItemWithId[] | undefined,
  costId: string
) {
  const { toUpdate, toCreate, toDeleteIds } = prepareBatchOperations(
    prevItems,
    payloadItems,
    ({ id, ...item }) => ({ ...item, costId })
  );

  const [updatedItems, createdItems] = await Promise.all([
    Promise.all(
      toUpdate.map(({ id, data }) =>
        prisma.ingredient.upsert({
          where: { id },
          update: data as Prisma.IngredientUpdateInput,
          create: {
            ...data,
            id,
            costId,
          } as unknown as Prisma.IngredientCreateInput,
        })
      )
    ),
    prisma.ingredient.createManyAndReturn({
      data: toCreate.map(({ id: _, ...item }) => item) as Prisma.IngredientCreateManyInput[],
    }),
    toDeleteIds.length > 0
      ? prisma.ingredient.deleteMany({ where: { id: { in: toDeleteIds } } })
      : Promise.resolve({ count: 0 }),
  ]);

  return [...updatedItems, ...createdItems];
}

export async function processPackagingsBatch(
  prevItems: ItemWithId[],
  payloadItems: ItemWithId[] | undefined,
  costId: string
) {
  const { toUpdate, toCreate, toDeleteIds } = prepareBatchOperations(
    prevItems,
    payloadItems,
    ({ id, ...item }) => ({ ...item, costId })
  );

  const [updatedItems, createdItems] = await Promise.all([
    Promise.all(
      toUpdate.map(({ id, data }) =>
        prisma.packaging.upsert({
          where: { id },
          update: data as Prisma.PackagingUpdateInput,
          create: {
            ...data,
            id,
            costId,
          } as unknown as Prisma.PackagingCreateInput,
        })
      )
    ),
    prisma.packaging.createManyAndReturn({
      data: toCreate.map(({ id: _, ...item }) => item) as Prisma.PackagingCreateManyInput[],
    }),
    toDeleteIds.length > 0
      ? prisma.packaging.deleteMany({ where: { id: { in: toDeleteIds } } })
      : Promise.resolve({ count: 0 }),
  ]);

  return [...updatedItems, ...createdItems];
}

export async function processLaborsBatch(
  prevItems: ItemWithId[],
  payloadItems: ItemWithId[] | undefined,
  costId: string
) {
  const { toUpdate, toCreate, toDeleteIds } = prepareBatchOperations(
    prevItems,
    payloadItems,
    ({ id, ...item }) => ({ ...item, costId })
  );

  const [updatedItems, createdItems] = await Promise.all([
    Promise.all(
      toUpdate.map(({ id, data }) =>
        prisma.labor.upsert({
          where: { id },
          update: data as Prisma.LaborUpdateInput,
          create: {
            ...data,
            id,
            costId,
          } as unknown as Prisma.LaborCreateInput,
        })
      )
    ),
    prisma.labor.createManyAndReturn({
      data: toCreate.map(({ id: _, ...item }) => item) as Prisma.LaborCreateManyInput[],
    }),
    toDeleteIds.length > 0
      ? prisma.labor.deleteMany({ where: { id: { in: toDeleteIds } } })
      : Promise.resolve({ count: 0 }),
  ]);

  return [...updatedItems, ...createdItems];
}

export async function processOthersBatch(
  prevItems: ItemWithId[],
  payloadItems: ItemWithId[] | undefined,
  costId: string
) {
  const { toUpdate, toCreate, toDeleteIds } = prepareBatchOperations(
    prevItems,
    payloadItems,
    ({ id, ...item }) => ({ ...item, costId })
  );

  const [updatedItems, createdItems] = await Promise.all([
    Promise.all(
      toUpdate.map(({ id, data }) =>
        prisma.other.upsert({
          where: { id },
          update: data as Prisma.OtherUpdateInput,
          create: {
            ...data,
            id,
            costId,
          } as unknown as Prisma.OtherCreateInput,
        })
      )
    ),
    prisma.other.createManyAndReturn({
      data: toCreate.map(({ id: _, ...item }) => item) as Prisma.OtherCreateManyInput[],
    }),
    toDeleteIds.length > 0
      ? prisma.other.deleteMany({ where: { id: { in: toDeleteIds } } })
      : Promise.resolve({ count: 0 }),
  ]);

  return [...updatedItems, ...createdItems];
}
