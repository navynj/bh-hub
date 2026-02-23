import { auth } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memoId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Access denied' }, { status: 401 });
    }

    const { id: costId, memoId } = await params;
    const { memo } = await req.json();

    if (!memo || typeof memo !== 'string' || !memo.trim()) {
      return NextResponse.json(
        { message: 'Memo is required' },
        { status: 400 }
      );
    }

    const existingMemo = await prisma.costMemo.findUnique({
      where: { id: memoId },
      select: { costId: true },
    });

    if (!existingMemo || existingMemo.costId !== costId) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const updatedMemo = await prisma.costMemo.update({
      where: { id: memoId },
      data: { memo: memo.trim() },
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      memo: {
        id: updatedMemo.id,
        memo: updatedMemo.memo,
        userId: updatedMemo.userId,
        user: updatedMemo.User,
        createdAt: updatedMemo.createdAt,
        updatedAt: updatedMemo.updatedAt,
      },
    });
  } catch (error) {
    console.error('Failed to update memo:', error);
    return NextResponse.json(
      { message: 'Failed to update memo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memoId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Access denied' }, { status: 401 });
    }

    const { id: costId, memoId } = await params;

    const existingMemo = await prisma.costMemo.findUnique({
      where: { id: memoId },
      select: { costId: true },
    });

    if (!existingMemo || existingMemo.costId !== costId) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    await prisma.costMemo.delete({
      where: { id: memoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete memo:', error);
    return NextResponse.json(
      { message: 'Failed to delete memo' },
      { status: 500 }
    );
  }
}
