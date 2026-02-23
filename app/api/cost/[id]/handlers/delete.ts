import { auth } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new Response('Session not found', { status: 401 });
    }

    const { id } = await params;

    const deleted = await prisma.cost.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Deleted successfully', deleted },
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
