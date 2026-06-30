import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id: BigInt(id) },
      include: { class: true },
    });
    if (!student) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(serializePrisma(student));
  } catch {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, nim, classId, password } = await req.json();

    const data: any = {
      ...(name && { name }),
      ...(nim && { nim }),
      ...(classId && { classId: BigInt(classId) }),
    };

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const student = await prisma.student.update({
      where: { id: BigInt(id) },
      data,
    });

    return NextResponse.json(serializePrisma(student));
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'NIM sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error updating student' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.faceDescriptor !== undefined) updateData.faceDescriptor = body.faceDescriptor;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nim !== undefined) updateData.nim = body.nim;
    if (body.classId !== undefined) updateData.classId = BigInt(body.classId);

    const student = await prisma.student.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    return NextResponse.json(serializePrisma(student));
  } catch (error) {
    return NextResponse.json({ message: 'Error patching student' }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Delete related attendances first
    await prisma.attendance.deleteMany({
      where: { studentId: BigInt(id) },
    });

    await prisma.student.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ message: 'Student deleted' });
  } catch (error) {
    return NextResponse.json({ message: 'Error deleting student' }, { status: 500 });
  }
}
