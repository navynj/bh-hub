import { auth } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { LexoRank } from 'lexorank';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Access denied' }, { status: 401 });
    }

    const { id: costId } = await params;

    const cost = await prisma.cost.findUnique({
      where: { id: costId },
      select: { id: true },
    });
    if (!cost) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const memos = await prisma.costMemo.findMany({
      where: { costId },
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      memos: memos.map((memo) => ({
        id: memo.id,
        memo: memo.memo,
        userId: memo.userId,
        user: memo.User,
        createdAt: memo.createdAt,
        updatedAt: memo.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch memos:', error);
    return NextResponse.json(
      { message: 'Failed to fetch memos' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Access denied' }, { status: 401 });
    }

    const { id: costId } = await params;
    const { memo } = await req.json();

    if (!memo || typeof memo !== 'string' || !memo.trim()) {
      return NextResponse.json(
        { message: 'Memo is required' },
        { status: 400 }
      );
    }

    const cost = await prisma.cost.findUnique({
      where: { id: costId },
      select: { id: true },
    });
    if (!cost) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const lastMemo = await prisma.costMemo.findFirst({
      where: { costId },
      orderBy: { rank: 'desc' },
      select: { rank: true },
    });

    const newRank = lastMemo
      ? LexoRank.parse(lastMemo.rank).genNext().toString()
      : LexoRank.middle().toString();

    const newMemo = await prisma.costMemo.create({
      data: {
        costId,
        userId: session.user.id,
        memo: memo.trim(),
        rank: newRank,
      },
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      memo: {
        id: newMemo.id,
        memo: newMemo.memo,
        userId: newMemo.userId,
        user: newMemo.User,
        createdAt: newMemo.createdAt,
        updatedAt: newMemo.updatedAt,
      },
    });
  } catch (error) {
    console.error('Failed to create memo:', error);
    return NextResponse.json(
      { message: 'Failed to create memo' },
      { status: 500 }
    );
  }
}
