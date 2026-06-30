import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { descriptor } = await req.json(); // Array of numbers

    if (!descriptor) {
      return NextResponse.json({ message: 'Descriptor is required' }, { status: 400 });
    }

    // Fetch all students with face descriptors
    const students = await prisma.student.findMany({
      where: {
        faceDescriptor: { not: null },
      },
      select: {
        id: true,
        name: true,
        faceDescriptor: true,
      },
    });

    // Simple Euclidean distance or use face-api.js utility
    // Since we are in the backend, we can't easily use face-api.js matcher without loading models
    // But we can just calculate the distance manually if it's floating point arrays
    
    let bestMatch = { id: '', name: '', distance: 1.0 };
    // Fetch dynamic threshold from settings
    const settings = await prisma.setting.findUnique({ where: { key: 'face_accuracy_threshold' } });
    const threshold = settings ? parseFloat(settings.value) : 0.45;

    for (const student of students) {
      const storedDescriptor = JSON.parse(student.faceDescriptor!);
      const distance = euclideanDistance(descriptor, storedDescriptor);
      
      if (distance < bestMatch.distance) {
        bestMatch = { 
          id: student.id.toString(), 
          name: student.name, 
          distance 
        };
      }
    }

    if (bestMatch.distance <= threshold) {
      return NextResponse.json({
        success: true,
        studentId: bestMatch.id,
        name: bestMatch.name,
        confidence: 1 - bestMatch.distance,
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Wajah tidak dikenali',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

function euclideanDistance(arr1: number[], arr2: number[]) {
  if (arr1.length !== arr2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    sum += Math.pow(arr1[i] - arr2[i], 2);
  }
  return Math.sqrt(sum);
}
