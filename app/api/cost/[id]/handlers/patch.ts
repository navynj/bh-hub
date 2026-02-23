import { auth } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { logCostHistory } from '../utils/historyLogging';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new Response('Session not found', { status: 401 });
    }

    const { id } = await params;
    const { locked } = await req.json();

    if (typeof locked !== 'boolean') {
      return NextResponse.json(
        { message: 'locked field must be a boolean' },
        { status: 400 }
      );
    }

    const costBeforeUpdate = await prisma.cost.findUnique({
      where: { id },
      select: { locked: true },
    });

    const updated = await prisma.cost.update({
      where: { id },
      data: { locked },
    });

    if (
      costBeforeUpdate &&
      costBeforeUpdate.locked !== locked &&
      session.user.id
    ) {
      await logCostHistory(
        id,
        session.user.id,
        locked ? 'locked' : 'unlocked',
        { locked: { from: costBeforeUpdate.locked, to: locked } }
      );
    }

    return NextResponse.json(
      { message: 'Cost lock status updated successfully', cost: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: (error as Error)?.message || 'Error occurred' },
      { status: 500 }
    );
  }
}
