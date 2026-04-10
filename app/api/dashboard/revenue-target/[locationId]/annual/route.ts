import { auth, getOfficeOrAdmin } from '@/lib/auth';
import { toApiErrorResponse } from '@/lib/core/errors';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const patchBodySchema = z.object({
  calendarYear: z.number().int().min(2000).max(2100),
  goalAmount: z.number().positive().finite(),
});

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ locationId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { locationId } = await ctx.params;
    if (!getOfficeOrAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cyRaw = new URL(request.url).searchParams.get('calendarYear');
    const calendarYear = cyRaw != null ? Number.parseInt(cyRaw, 10) : NaN;
    if (!Number.isFinite(calendarYear)) {
      return NextResponse.json(
        { error: 'calendarYear query required (integer)' },
        { status: 400 },
      );
    }

    const loc = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!loc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const row = await prisma.revenueAnnualGoal.findUnique({
      where: {
        locationId_calendarYear: { locationId, calendarYear },
      },
    });

    return NextResponse.json({
      ok: true,
      calendarYear,
      goalAmount:
        row?.goalAmount != null ? Number(row.goalAmount) : null,
    });
  } catch (err: unknown) {
    return toApiErrorResponse(err, 'GET revenue-target annual');
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ locationId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { locationId } = await ctx.params;
    if (!getOfficeOrAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const json: unknown = await request.json().catch(() => null);
    const parsed = patchBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { calendarYear, goalAmount } = parsed.data;

    const loc = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!loc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.revenueAnnualGoal.upsert({
      where: {
        locationId_calendarYear: { locationId, calendarYear },
      },
      create: {
        locationId,
        calendarYear,
        goalAmount,
      },
      update: {
        goalAmount,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return toApiErrorResponse(err, 'PATCH revenue-target annual');
  }
}
