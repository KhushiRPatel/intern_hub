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
    cache: 'no-store',
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'Hasura error');
  return json.data as T;
}

// Resolve a user UUID from email — needed for old tokens where sub=email
async function getUserIdByEmail(email: string): Promise<string | null> {
  const data = await hasura<{ users: { id: string }[] }>(
    `query GetUserByEmail($email: citext!) {
      users(where: { email: { _eq: $email } }, limit: 1) { id }
    }`,
    { email },
  );
  return data?.users?.[0]?.id ?? null;
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

    let payload: { sub?: string; email?: string; purpose?: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as typeof payload;
    } catch (err) {
      const isExpired = err instanceof Error && err.name === 'TokenExpiredError';
      return NextResponse.json(
        { message: isExpired ? 'This link has expired. Request a new one.' : 'Invalid token' },
        { status: 400 },
      );
    }

    if (payload.purpose !== 'password_reset') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (HASURA_ADMIN) {
      // Determine the real user UUID:
      // - New tokens (from /api/auth/forgot-password): sub = UUID
      // - Old tokens (from /api/send-email): sub = email string
      // Safely detect by checking if sub looks like a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let userId: string | null = null;

      if (payload.sub && uuidRegex.test(payload.sub)) {
        // sub is a proper UUID
        userId = payload.sub;
      } else if (payload.email) {
        // sub was the email — look up UUID by email
        userId = await getUserIdByEmail(payload.email);
      }

      if (!userId) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      const result = await hasura<{ update_users_by_pk: { id: string } | null }>(
        `mutation UpdatePassword($id: uuid!, $hash: String!) {
          update_users_by_pk(pk_columns: { id: $id }, _set: { password_hash: $hash }) { id }
        }`,
        { id: userId, hash: passwordHash },
      );

      if (!result?.update_users_by_pk) {
         // Attempt to upsert the user if they were a Demo user that wasn't legally in DB yet.
         // Wait, we don't know their name or role. But we MUST throw an error if we can't update them,
         // otherwise they get a false "success" message but the password didn't stick!
         // Although Demo mode might be on, we check `if (HASURA_ADMIN)`. If Hasura is active, this should work.
         return NextResponse.json({ message: 'User not found in database. Cannot reset password.' }, { status: 404 });
      }
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
