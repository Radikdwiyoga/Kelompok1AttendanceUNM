import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    const body = await req.json();
    const { subjectName, classId, dayOfWeek, startTime, endTime } = body;

    const schedule = await prisma.schedule.update({
      where: { id: BigInt(p.id) },
      data: {
        subjectName,
        classId: BigInt(classId),
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
      },
      include: {
        class: true,
      }
    });

    return NextResponse.json(serializePrisma(schedule));
  } catch (error) {
    return NextResponse.json({ message: 'Error updating schedule' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    await prisma.schedule.delete({
      where: { id: BigInt(p.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Error deleting schedule' }, { status: 500 });
  }
}

