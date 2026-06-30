import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { students: true } } },
    });
    return NextResponse.json(serializePrisma(classes));
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching classes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    const newClass = await prisma.class.create({ data: { name } });
    return NextResponse.json(serializePrisma(newClass), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error creating class' }, { status: 500 });
  }
}
