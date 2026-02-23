import { auth } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session) {
    return new Response('Session not found', { status: 401 });
  }

  try {
    const tags = await prisma.tag.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: (error as Error)?.message || 'Error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response('Session not found', { status: 401 });
  }

  try {
    const { name, color } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: 'Tag name is required' },
        { status: 400 }
      );
    }

    const validColors = [
      'red',
      'orange',
      'yellow',
      'brown',
      'green',
      'blue',
      'purple',
      'pink',
      'gray',
    ];
    const tagColor = validColors.includes(color) ? color : 'gray';

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: tagColor,
      },
    });

    return NextResponse.json(tag, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: (error as Error)?.message || 'Error occurred' },
      { status: 500 }
    );
  }
}
