import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { checkAuth, getUserFromToken, logPermissionDenial } from '../../auth/utils';
import { sendPasswordSetupEmail } from '@/lib/email';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN    = process.env.HASURA_ADMIN_SECRET || '';
const JWT_SECRET      = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
    // ── 0. Auth guard ─────────────────────────────────────────────────────
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) {
      return authCheck.response!;
    }

    const { userId, role } = getUserFromToken(authCheck.decoded);

    // Allow admin and department_person only
    if (role !== 'admin' && role !== 'department_person') {
      logPermissionDenial(userId, role, 'create_intern');
      return NextResponse.json({ message: 'Forbidden: insufficient role' }, { status: 403 });
    }

    // ── 1. Parse & validate body ──────────────────────────────────────────
    const body = await req.json() as {
      name: string;
      email: string;
      phone?: string | null;
      alternate_phone?: string | null;
      college: string;
      university?: string | null;
      college_email?: string | null;
      degree: string;
      branch: string;
      specialization?: string | null;
      graduation_year?: number | string | null;
      department_id: string;
      start_date: string;
      end_date?: string | null;
      status?: string;
    };

    const {
      name,
      email,
      phone,
      alternate_phone,
      college,
      university,
      college_email,
      degree,
      branch,
      specialization,
      graduation_year: graduationYearRaw,
      department_id,
      start_date,
      end_date,
      status,
    } = body;

    let graduation_year: number | null = null;
    if (graduationYearRaw !== undefined && graduationYearRaw !== null && graduationYearRaw !== '') {
      const n =
        typeof graduationYearRaw === 'number'
          ? graduationYearRaw
          : parseInt(String(graduationYearRaw), 10);
      if (Number.isInteger(n) && n >= 1900 && n <= 2100) graduation_year = n;
    }

    if (!name || !email || !college || !degree || !branch || !department_id || !start_date) {
      return NextResponse.json(
        { message: 'Missing required fields: name, email, college, degree, branch, department, start date' },
        { status: 400 },
      );
    }

    // ── 2. department_person: enforce own department only ─────────────────
    if (role === 'department_person') {
      const decoded = authCheck.decoded as { 'https://hasura.io/jwt/claims'?: Record<string, string> };
      const claims  = decoded['https://hasura.io/jwt/claims'] ?? {};
      const allowedDeptId = claims['x-hasura-department-id'];

      if (!allowedDeptId || department_id !== allowedDeptId) {
        logPermissionDenial(userId, role, 'create_intern_wrong_department');
        return NextResponse.json(
          { message: 'You can only add interns to your own department' },
          { status: 403 },
        );
      }
    }

    const safeEmail = email.trim().toLowerCase();

    // ── 3. Duplicate check ────────────────────────────────────────────────
    type UserCheck = { users: { id: string }[] };
    const existing = await hasura<UserCheck>(
      `query CheckEmail($email: citext!) { users(where: { email: { _eq: $email } }, limit: 1) { id } }`,
      { email: safeEmail },
    );
    if (existing.users.length > 0) {
      return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
    }

    // ── 4. Create user ────────────────────────────────────────────────────
    const tempPass     = `${crypto.randomUUID()}-${Date.now()}`;
    const passwordHash = await bcrypt.hash(tempPass, 10);

    type InsertUserResult = { insert_users_one: { id: string; name: string; email: string } };
    const { insert_users_one } = await hasura<InsertUserResult>(
      `mutation CreateUser($obj: users_insert_input!) { insert_users_one(object: $obj) { id name email } }`,
      { obj: { name: name.trim(), email: safeEmail, password_hash: passwordHash, role: 'intern', department_id } },
    );
    const newUserId = insert_users_one.id;

    // ── 5. Create intern record ───────────────────────────────────────────
    type InsertInternResult = {
      insert_interns_one: {
        id: string; name: string; email: string; status: string;
      };
    };
    const { insert_interns_one } = await hasura<InsertInternResult>(
      `mutation CreateIntern($obj: interns_insert_input!) {
        insert_interns_one(object: $obj) { id name email status }
      }`,
      {
        obj: {
          name:              name.trim(),
          email:             safeEmail,
          phone:             phone || null,
          alternate_phone:   alternate_phone?.trim() || null,
          college:           college.trim(),
          university:        university?.trim() || null,
          college_email:     (() => {
            const t = college_email?.trim();
            return t ? t.toLowerCase() : null;
          })(),
          degree:            degree.trim(),
          branch:            branch.trim(),
          specialization:    specialization?.trim() || null,
          graduation_year:   graduation_year ?? null,
          department_id,
          start_date,
          end_date:          end_date || null,
          status:            status || 'active',
          user_id:           newUserId,
          created_by:        userId,
        },
      },
    );

    // ── 6. Password setup email ───────────────────────────────────────────
    const resetToken = jwt.sign(
      { sub: newUserId, email: safeEmail, purpose: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '24h' },
    );
    const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
    const { sent, error: emailError } = await sendPasswordSetupEmail(name.trim(), safeEmail, resetLink);

    return NextResponse.json({
      intern:    insert_interns_one,
      emailSent: sent,
      resetLink,
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