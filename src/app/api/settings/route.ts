import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const settingsObj = settings.reduce((acc: any, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
    return NextResponse.json(settingsObj);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    for (const key in body) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: body[key].toString() },
        create: { key, value: body[key].toString() },
      });
    }
    
    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    return NextResponse.json({ message: 'Error updating settings' }, { status: 500 });
  }
}
