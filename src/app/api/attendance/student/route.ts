import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const studentId = decoded.id;

        if (decoded.role !== 'MAHASISWA') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const attendances = await prisma.attendance.findMany({
            where: {
                studentId: BigInt(studentId),
            },
            include: {
                student: {
                    include: { class: true }
                }
            },
            orderBy: { date: 'desc' },
        });

        // Calculate summary
        const totalHadir = attendances.filter(a => a.status === 'hadir').length;
        const totalTerlambat = attendances.filter(a => a.status === 'terlambat').length;

        return NextResponse.json({
            history: serializePrisma(attendances),
            summary: {
                hadir: totalHadir,
                terlambat: totalTerlambat,
                total: attendances.length
            }
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error fetching student history' }, { status: 500 });
    }
}
