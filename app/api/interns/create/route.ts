import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendPasswordSetupEmail } from '@/lib/email';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN = process.env.HASURA_ADMIN_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string;
      email: string;
      phone?: string | null;
      college: string;
      department_id: string;
      start_date: string;
      end_date?: string | null;
      status?: string;
    };

    const { name, email, phone, college, department_id, start_date, end_date, status } = body;

    if (!name || !email || !college || !department_id || !start_date) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const safeEmail = email.trim().toLowerCase();

    // 1. Check for duplicate
    type UserCheck = { users: { id: string }[] };
    const existing = await hasura<UserCheck>(
      `query CheckEmail($email: String!) { users(where: { email: { _eq: $email } }, limit: 1) { id } }`,
      { email: safeEmail },
    );
    if (existing.users.length > 0) {
      return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
    }

    // 2. Create user with an unknown random password (intern sets their own via email link)
    const tempPass = `${crypto.randomUUID()}-${Date.now()}`;
    const passwordHash = await bcrypt.hash(tempPass, 10);

    type InsertUserResult = { insert_users_one: { id: string; name: string; email: string } };
    const { insert_users_one } = await hasura<InsertUserResult>(
      `mutation CreateUser($obj: users_insert_input!) { insert_users_one(object: $obj) { id name email } }`,
      { obj: { name: name.trim(), email: safeEmail, password_hash: passwordHash, role: 'intern', department_id } },
    );
    const userId = insert_users_one.id;

    // 3. Create intern record linked to user
    type InsertInternResult = {
      insert_interns_one: {
        id: string; name: string; email: string; status: string;
        department: { id: string; name: string } | null;
      };
    };
    const { insert_interns_one } = await hasura<InsertInternResult>(
      `mutation CreateIntern($obj: interns_insert_input!) {
        insert_interns_one(object: $obj) { id name email status department { id name } }
      }`,
      {
        obj: {
          name: name.trim(),
          email: safeEmail,
          phone: phone || null,
          college: college.trim(),
          department_id,
          start_date,
          end_date: end_date || null,
          status: status || 'active',
          user_id: userId,
        },
      },
    );

    // 4. Generate a 24-hour password-setup JWT token
    const resetToken = jwt.sign(
      { sub: userId, email: safeEmail, purpose: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '24h' },
    );
    const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

    // 5. Send welcome + setup email
    const { sent, error: emailError } = await sendPasswordSetupEmail(name.trim(), safeEmail, resetLink);

    return NextResponse.json({
      intern: insert_interns_one,
      emailSent: sent,
      resetLink, // Always returned — admin can manually share if email not configured
      ...(emailError && { emailNote: emailError }),
    });
  } catch (err) {
    console.error('[api/interns/create]', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
