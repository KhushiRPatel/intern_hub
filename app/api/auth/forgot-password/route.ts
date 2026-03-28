import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { sendPasswordSetupEmail } from '@/lib/email';

const JWT_SECRET = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN = process.env.HASURA_ADMIN_SECRET || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Hardcoded demo users (same as login route)
const DEMO_USERS = [
  { id: 'a1b2c3d4-0001-0001-0001-000000000001', name: 'System Admin',     email: 'admin@company.com'       },
  { id: 'a1b2c3d4-0002-0002-0002-000000000002', name: 'Raj Mehta (AI)',   email: 'raj.ai@company.com'      },
  { id: 'a1b2c3d4-0003-0003-0003-000000000003', name: 'Priya Nair (PHP)', email: 'priya.php@company.com'   },
  { id: 'a1b2c3d4-0004-0004-0004-000000000004', name: 'John Intern',      email: 'john.intern@student.com' },
];

async function findUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | null> {
  if (!HASURA_ADMIN) {
    // Demo mode: check hardcoded users
    return DEMO_USERS.find(u => u.email === email) ?? null;
  }

  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': HASURA_ADMIN },
      body: JSON.stringify({
        query: `query FindUser($email: citext!) {
          users(where: { email: { _eq: $email } }, limit: 1) { id name email }
        }`,
        variables: { email },
      }),
      cache: 'no-store',
    });
    const json = await res.json();
    return json.data?.users?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string };

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const safeEmail = String(email).trim().toLowerCase();
    const user = await findUserByEmail(safeEmail);

    // Always return success to avoid leaking which emails exist
    if (!user) {
      return NextResponse.json({ sent: true });
    }

    // Generate token with sub = user UUID (not email)
    const token = jwt.sign(
      { sub: user.id, email: user.email, purpose: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '24h' },
    );
    const resetLink = `${APP_URL}/reset-password?token=${token}`;

    const result = await sendPasswordSetupEmail(user.name, user.email, resetLink);

    // In dev/demo mode (SMTP not configured), return the link so it can be shown to the user
    return NextResponse.json({
      sent: result.sent,
      ...((!result.sent) && { resetLink }),
    });
  } catch (err) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
