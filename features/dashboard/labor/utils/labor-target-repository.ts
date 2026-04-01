import { prisma } from '@/lib/core/prisma';

export type LaborTargetRow = {
  id: string;
  locationId: string;
  yearMonth: string;
  rate: number;
  referencePeriodMonths: number;
};

function mapLaborTarget(raw: {
  id: string;
  locationId: string;
  yearMonth: string;
  rate: unknown;
  referencePeriodMonths: number;
}): LaborTargetRow {
  return {
    id: raw.id,
    locationId: raw.locationId,
    yearMonth: raw.yearMonth,
    rate: Number(raw.rate),
    referencePeriodMonths: raw.referencePeriodMonths,
  };
}

export async function getLaborTargetByLocationAndMonth(
  locationId: string,
  yearMonth: string,
): Promise<LaborTargetRow | null> {
  const raw = await prisma.laborTarget.findUnique({
    where: { locationId_yearMonth: { locationId, yearMonth } },
  });
  return raw ? mapLaborTarget(raw) : null;
}

export async function upsertLaborTarget(
  locationId: string,
  yearMonth: string,
  input: { rate: number; referencePeriodMonths: number },
): Promise<LaborTargetRow> {
  const raw = await prisma.laborTarget.upsert({
    where: { locationId_yearMonth: { locationId, yearMonth } },
    create: {
      locationId,
      yearMonth,
      rate: input.rate,
      referencePeriodMonths: input.referencePeriodMonths,
    },
    update: {
      rate: input.rate,
      referencePeriodMonths: input.referencePeriodMonths,
    },
  });
  return mapLaborTarget(raw);
}
