import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Paths that are accessible without a token
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/login')) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Check if the path is protected
  const protectedPaths = [
    '/dashboard',
    '/students',
    '/attendance',
    '/reports',
    '/api/students',
    '/api/face',
    '/api/attendance',
    '/api/reports',
    '/settings',
    '/api/settings',
  ];

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !token) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|models).*)',
  ],
};
