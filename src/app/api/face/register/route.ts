import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { studentId, descriptor } = await req.json();

    if (!studentId || !descriptor) {
      return NextResponse.json({ message: 'Missing data' }, { status: 400 });
    }

    await prisma.student.update({
      where: { id: BigInt(studentId) },
      data: {
        faceDescriptor: JSON.stringify(descriptor),
      },
    });

    return NextResponse.json({ success: true, message: 'Wajah berhasil didaftarkan' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
