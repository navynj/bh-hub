import { auth } from '@/lib/auth';
import { prisma } from '@/lib/core/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return new Response('Session not found', { status: 401 });
  }

  try {
    const { id } = await params;
    const { name, color } = await req.json();

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
    const tagColor = color && validColors.includes(color) ? color : undefined;

    const updateData: { name?: string; color?: string } = {};
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { message: 'Tag name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (tagColor !== undefined) {
      updateData.color = tagColor;
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(tag, { status: 200 });
  } catch (error) {
    console.error(error);
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ message: 'Tag not found' }, { status: 404 });
    }
    return NextResponse.json(
      { message: (error as Error)?.message || 'Error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return new Response('Session not found', { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.tag.delete({
      where: { id },
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ message: 'Tag not found' }, { status: 404 });
    }
    return NextResponse.json(
      { message: (error as Error)?.message || 'Error occurred' },
      { status: 500 }
    );
  }
}
