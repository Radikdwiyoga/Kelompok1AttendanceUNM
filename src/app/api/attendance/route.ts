import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180; 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in m
}

export async function POST(req: NextRequest) {
  try {
    const { studentId, confidence, type = 'IN', latitude, longitude, locationDenied } = await req.json();

    // Get settings
    const [thresholdSet, campusLatSet, campusLngSet, campusRadiusSet] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'face_accuracy_threshold' } }),
      prisma.setting.findUnique({ where: { key: 'campus_lat' } }),
      prisma.setting.findUnique({ where: { key: 'campus_lng' } }),
      prisma.setting.findUnique({ where: { key: 'campus_radius' } }),
    ]);

    const threshold = thresholdSet ? parseFloat(thresholdSet.value) : 0.65;
    
    // Geolocation parameters
    const campusLat = campusLatSet ? parseFloat(campusLatSet.value) : -6.200000;
    const campusLng = campusLngSet ? parseFloat(campusLngSet.value) : 106.816666;
    const campusRadius = campusRadiusSet ? parseInt(campusRadiusSet.value) : 100;

    let locationStatus = 'valid';
    if (locationDenied) {
      locationStatus = 'denied';
    } else if (latitude && longitude) {
      const distance = getDistanceFromLatLonInM(campusLat, campusLng, latitude, longitude);
      if (distance > campusRadius) {
         locationStatus = 'out_of_range';
      }
    } else {
      locationStatus = 'unknown';
    }

    if (confidence === undefined || confidence === null || confidence < threshold) {
      return NextResponse.json({ message: 'Akurasi tidak mencukupi' }, { status: 400 });
    }

    // Standardize to Asia/Jakarta for date extraction
    const now = new Date();
    // Use Intl to get Jakarta date components
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
    const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(now);
    const todayStr = `${year}-${month}-${day}`;
    const todayStart = new Date(`${todayStr}T00:00:00Z`);

    // Check if already attended for this SPECIFIC type today
    const existing = await prisma.attendance.findFirst({
      where: {
        studentId: BigInt(studentId),
        date: todayStart,
        type: type as any
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: `Anda sudah melakukan absen ${type === 'IN' ? 'masuk' : 'pulang'} hari ini`,
        alreadyAttended: true,
        data: serializePrisma(existing)
      });
    }

    // Determine status based on Schedules
    let status = 'hadir';
    if (type === 'IN') {
      const student = await prisma.student.findUnique({
        where: { id: BigInt(studentId) },
        include: { class: true }
      });
      
      if (student && student.classId) {
         const currentDay = now.getDay();
         const schedules = await prisma.schedule.findMany({
            where: {
               classId: student.classId,
               dayOfWeek: currentDay
            }
         });
         
         // Assuming a base 15 minute tolerance
         if (schedules.length > 0) {
            let isLate = true;
            for (const schedule of schedules) {
               const [h, m] = schedule.startTime.split(':').map(Number);
               const scheduleTime = new Date(now);
               scheduleTime.setHours(h, m, 0, 0);
               scheduleTime.setMinutes(scheduleTime.getMinutes() + 15); // +15 mins tolerance
               
               // If there is ANY schedule today where we haven't crossed the late threshold, they are hadir for that class
               if (now <= scheduleTime) {
                  isLate = false;
                  break;
               }
            }
            if (isLate) {
               status = 'terlambat';
            }
         }
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId: BigInt(studentId),
        date: todayStart,
        time: now,
        status: status as any,
        type: type as any,
        confidenceScore: parseFloat(Number(confidence).toFixed(2)),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        locationStatus,
      },
    });

    let resMessage = null;
    let isWarning = false;
    if (locationStatus === 'out_of_range') {
        resMessage = 'Berhasil, namun di luar radius kampus.';
        isWarning = true;
    } else if (locationStatus === 'denied') {
        resMessage = 'Berhasil, lokasi GPS tidak diizinkan.';
        isWarning = true;
    } else if (locationStatus === 'unknown') {
        resMessage = 'Berhasil, lokasi sedang dicari.';
        isWarning = true;
    }

    return NextResponse.json(
      { success: true, data: serializePrisma(attendance), warning: isWarning, message: resMessage },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error logging attendance' }, { status: 500 });
  }
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    // NOTE: schema field is "type" (AttendanceType: IN | OUT), not "mode".
    const type = searchParams.get('type');
    const date = searchParams.get('date');

    let whereClause: any = {};

    if (studentId) {
      whereClause.studentId = BigInt(studentId);
    }

    if (type) {
      whereClause.type = type;
    }

    if (date) {
      // schema's date field is a @db.Date (calendar day only), so match it
      // directly rather than as a timestamp range.
      const startDate = new Date(date);
      whereClause.date = startDate;
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            nim: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { time: 'desc' },
      ],
    });

    return NextResponse.json(serializePrisma(attendances));
  } catch (error) {
    console.error('Attendance retrieval error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
