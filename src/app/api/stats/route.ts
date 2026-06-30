import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const [totalStudents, todayAttendance] = await Promise.all([
            prisma.student.count(),
            prisma.attendance.findMany({
                where: {
                    date: {
                        gte: today,
                        lt: tomorrow
                    }
                }
            })
        ]);

        const hadir = todayAttendance.filter(a => a.status === 'hadir').length;
        const terlambat = todayAttendance.filter(a => a.status === 'terlambat').length;
        const absen = Math.max(0, totalStudents - (hadir + terlambat));

        return NextResponse.json({
            total: totalStudents,
            hadir,
            terlambat,
            absen
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({ message: 'Error fetching stats' }, { status: 500 });
    }
}
