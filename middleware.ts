import { NextRequest, NextResponse } from 'next/server';

type Role = 'admin' | 'department_person' | 'intern';

type RouteRule = {
  pattern: RegExp;
  roles: Role[];
};

const ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/dashboard\/tasks(?:\/.*)?$/, roles: [] },
  { pattern: /^\/interns(?:\/.*)?$/, roles: ['admin', 'department_person'] },
  { pattern: /^\/users\/departments(?:\/.*)?$/, roles: ['admin'] },
  { pattern: /^\/users\/department-persons(?:\/.*)?$/, roles: ['admin'] },
  { pattern: /^\/users\/add-department-person(?:\/.*)?$/, roles: ['admin'] },
  { pattern: /^\/chatbot(?:\/.*)?$/, roles: ['admin', 'department_person'] },
];

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
}

function getRoleFromToken(token: string): Role | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(decodeBase64Url(payload)) as {
      role?: string;
      'https://hasura.io/jwt/claims'?: { 'x-hasura-role'?: string };
    };
    const role = decoded['https://hasura.io/jwt/claims']?.['x-hasura-role'] ?? decoded.role;
    return role === 'admin' || role === 'department_person' || role === 'intern' ? role : null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/access-denied') {
    return NextResponse.next();
  }

  const rule = ROUTE_RULES.find((entry) => entry.pattern.test(pathname));
  if (!rule) return NextResponse.next();

  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const role = getRoleFromToken(token);
  if (!role) {
    const url = new URL('/access-denied', request.url);
    url.searchParams.set('reason', 'invalid-session');
    return NextResponse.redirect(url);
  }

  if (!rule.roles.includes(role)) {
    const url = new URL('/access-denied', request.url);
    url.searchParams.set('reason', 'forbidden');
    url.searchParams.set('path', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/interns/:path*',
    '/users/:path*',
    '/chatbot/:path*',
  ],
};