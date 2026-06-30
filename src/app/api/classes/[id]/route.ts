import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.class.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ message: 'Kelas dihapus' });
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json({ message: 'Kelas masih memiliki mahasiswa terdaftar' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Gagal menghapus kelas' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name } = await req.json();
    const updated = await prisma.class.update({ where: { id: BigInt(id) }, data: { name } });
    return NextResponse.json(serializePrisma(updated));
  } catch {
    return NextResponse.json({ message: 'Gagal memperbarui kelas' }, { status: 500 });
  }
}
