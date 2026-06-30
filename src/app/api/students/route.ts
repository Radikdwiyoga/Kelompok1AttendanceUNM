import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const students = await prisma.student.findMany({
      include: { class: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(serializePrisma(students));
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching students' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, nim, classId, password } = await req.json();

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const student = await prisma.student.create({
      data: {
        name,
        nim,
        classId: BigInt(classId),
        password: hashedPassword,
      },
    });

    return NextResponse.json(serializePrisma(student), { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'NIM sudah terdaftar' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Gagal membuat data mahasiswa' }, { status: 500 });
  }
}

