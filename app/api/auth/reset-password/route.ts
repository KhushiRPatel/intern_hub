import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN = process.env.HASURA_ADMIN_SECRET || '';

async function hasura<T = unknown>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': HASURA_ADMIN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'Hasura error');
  return json.data as T;
}

/* ── GET /api/auth/reset-password?token=... — validate token ─── */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ valid: false, message: 'Token is required' }, { status: 400 });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { purpose?: string; email?: string };
    if (payload.purpose !== 'password_reset') {
      return NextResponse.json({ valid: false, message: 'Invalid token type' }, { status: 400 });
    }
    return NextResponse.json({ valid: true, email: payload.email });
  } catch (err) {
    const isExpired = err instanceof Error && err.name === 'TokenExpiredError';
    return NextResponse.json(
      { valid: false, message: isExpired ? 'This link has expired. Request a new one.' : 'Invalid or malformed token' },
      { status: 400 },
    );
  }
}

/* ── POST /api/auth/reset-password — set new password ─────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { token?: string; newPassword?: string };
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json({ message: 'Token and new password are required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 });
    }

    let payload: { sub?: string; purpose?: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as typeof payload;
    } catch (err) {
      const isExpired = err instanceof Error && err.name === 'TokenExpiredError';
      return NextResponse.json(
        { message: isExpired ? 'This link has expired. Request a new one.' : 'Invalid token' },
        { status: 400 },
      );
    }

    if (payload.purpose !== 'password_reset' || !payload.sub) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Skip Hasura update when no admin secret is configured (demo mode)
    if (HASURA_ADMIN) {
      await hasura(
        `mutation UpdatePassword($id: uuid!, $hash: String!) {
          update_users_by_pk(pk_columns: { id: $id }, _set: { password_hash: $hash }) { id }
        }`,
        { id: payload.sub, hash: passwordHash },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to reset password' },
      { status: 500 },
    );
  }
}
