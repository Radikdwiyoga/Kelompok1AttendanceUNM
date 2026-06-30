import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';

export async function GET(req: NextRequest) {
  try {
    const schedules = await prisma.schedule.findMany({
      include: {
        class: true,
      },
      orderBy: { dayOfWeek: 'asc' },
    });
    return NextResponse.json(serializePrisma(schedules));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error fetching schedules' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { subjectName, classId, dayOfWeek, startTime, endTime } = await req.json();

    const schedule = await prisma.schedule.create({
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

    return NextResponse.json(serializePrisma(schedule), { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error creating schedule' }, { status: 500 });
  }
}
