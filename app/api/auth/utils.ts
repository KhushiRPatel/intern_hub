import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';

export interface DecodedToken {
  sub: string;
  'https://hasura.io/jwt/claims': {
    'x-hasura-user-id': string;
    'x-hasura-role': string;
    'x-hasura-department-id'?: string;
  };
}

export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  return authHeader?.replace('Bearer ', '') || null;
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch {
    return null;
  }
}

export function getUserFromToken(decoded: DecodedToken) {
  return {
    userId:       decoded['https://hasura.io/jwt/claims']['x-hasura-user-id'],
    role:         decoded['https://hasura.io/jwt/claims']['x-hasura-role'],
    departmentId: decoded['https://hasura.io/jwt/claims']['x-hasura-department-id'],
  };
}

export function checkAuth(request: NextRequest): {
  success: boolean;
  response?: NextResponse;
  decoded?: DecodedToken;
} {
  const token = extractToken(request);
  if (!token) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized - no token' }, { status: 401 }),
    };
  }

  // ✅ FIX: use decodeToken() which wraps verify() in try/catch and returns
  //         null on failure — instead of calling jwt.verify() raw which throws
  //         and leaves `decoded` as the DecodedToken type but never null-checked.
  const decoded = decodeToken(token);
  if (!decoded) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized - invalid or expired token' }, { status: 401 }),
    };
  }

  return { success: true, decoded };
}

export function checkAdminRole(decoded: DecodedToken): boolean {
  return decoded['https://hasura.io/jwt/claims']['x-hasura-role'] === 'admin';
}

export function requireAdmin(decoded: DecodedToken): NextResponse | null {
  if (!checkAdminRole(decoded)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }
  return null;
}

export function logPermissionDenial(userId: string, role: string, operation: string): void {
  console.warn(`[AUTH] Permission denied - User: ${userId}, Role: ${role}, Operation: ${operation}`);
}