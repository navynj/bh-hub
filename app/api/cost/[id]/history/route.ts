import { auth } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new Response('Session not found', { status: 401 });
    }

    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeCreation = searchParams.get('includeCreation') === 'true';

    const allHistory = await prisma.costEditHistory.findMany({
      where: { costId: id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let creationEntry = null;
    const otherEntries: typeof allHistory = [];

    for (const entry of allHistory) {
      const log = entry.log as { action?: string };
      if (log?.action === 'created') {
        creationEntry = entry;
      } else {
        otherEntries.push(entry);
      }
    }

    const paginatedHistory = otherEntries.slice(offset, offset + limit);
    const totalCount = otherEntries.length;

    return NextResponse.json(
      {
        history: paginatedHistory,
        creationEntry: includeCreation ? creationEntry : null,
        totalCount,
        hasMore: offset + limit < totalCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Failed to fetch cost history' },
      { status: 500 }
    );
  }
}
