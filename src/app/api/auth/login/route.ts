import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { username },
    });

    let role = 'ADMIN';
    let matchId = '';
    let dbPassword = '';
    let matchUsername = username;

    if (user) {
      matchId = user.id.toString();
      dbPassword = user.password;
      role = user.role;
    } else {
      const student = await prisma.student.findFirst({
        where: { nim: username }
      });
      if (!student) {
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      }
      // @ts-ignore
      if (!student.password) {
        return NextResponse.json({ message: 'Akun belum memiliki password.' }, { status: 403 });
      }
      matchId = student.id.toString();
      // @ts-ignore
      dbPassword = student.password;
      role = 'MAHASISWA';
      matchUsername = student.name;
    }

    const isPasswordValid = await bcrypt.compare(password, dbPassword);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: matchId,
        username: matchUsername,
        role: role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    const response = NextResponse.json(
      { message: 'Login successful' },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 86400 * 30, // 30 days to match jwt
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
