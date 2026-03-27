import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { checkAuth, requireAdmin, getUserFromToken, logPermissionDenial } from '../../auth/utils';
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
    // ── Auth guard: admin only ───────────────────────────────────────────────
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role } = getUserFromToken(authCheck.decoded);
    const adminError = requireAdmin(authCheck.decoded);
    if (adminError) {
      logPermissionDenial(userId, role, 'create_department_person');
      return adminError;
    }

    const body = await req.json() as {
      name: string; email: string; phone?: string; department_id: string;
    };
    const name          = body.name?.trim();
    const email         = body.email?.trim().toLowerCase();
    const phone         = body.phone?.trim() || null;
    const department_id = body.department_id;

    if (!name || !email || !department_id) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // ── FIX: resolve real department UUID ────────────────────────────────────
    // The frontend may send a demo ID (e.g. "dept-ai-001") or a real UUID.
    // First try by PK, then fall back to matching by name via the demo ID suffix.
    type DeptResult = { departments_by_pk: { id: string } | null; departments: { id: string }[] };
    const deptData = await hasura<DeptResult>(
      `query ResolveDept($id: uuid!, $name_pattern: String!) {
        departments_by_pk(id: $id) { id }
        departments(where: { name: { _ilike: $name_pattern } }, limit: 1) { id }
      }`,
      {
        // Pass the raw value as UUID — Hasura will error if it's not a valid UUID,
        // so we catch and fall back to name lookup below.
        id:           department_id,
        // Extract a name hint from demo IDs like "dept-ai-001" → "%AI%"
        name_pattern: `%${department_id.replace(/^dept-/, '').replace(/-\d+$/, '')}%`,
      },
    ).catch(() => ({ departments_by_pk: null, departments: [] } as DeptResult));

    const realDeptId = deptData.departments_by_pk?.id ?? deptData.departments[0]?.id;

    if (!realDeptId) {
      return NextResponse.json(
        { message: 'Department not found. Please select a valid department.' },
        { status: 400 },
      );
    }

    // ── Duplicate email check ────────────────────────────────────────────────
    type UserCheck = { users: { id: string }[] };
    const existing = await hasura<UserCheck>(
      `query CheckEmail($email: citext!) {
        users(where: { email: { _eq: $email } }, limit: 1) { id }
      }`,
      { email },
    );
    if (existing.users.length > 0) {
      return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
    }

    // ── Create user with unguessable temp password ───────────────────────────
    // Intern sets real password via the emailed reset link (same flow as interns).
    const tempPass     = `${crypto.randomUUID()}-${Date.now()}`;
    const passwordHash = await bcrypt.hash(tempPass, 10);

    type InsertUserResult = { insert_users_one: { id: string; name: string; email: string } };
    const { insert_users_one } = await hasura<InsertUserResult>(
      `mutation CreateDepartmentPerson($obj: users_insert_input!) {
        insert_users_one(object: $obj) { id name email }
      }`,
      {
        obj: {
          name,
          email,
          phone,
          password_hash: passwordHash,
          role:          'department_person',
          department_id: realDeptId,   // ← real DB uuid
        },
      },
    );

    // ── Generate password-setup link (same as intern creation) ───────────────
    const resetToken = jwt.sign(
      { sub: insert_users_one.id, email, purpose: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '24h' },
    );
    const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

    const { sent, error: emailError } = await sendPasswordSetupEmail(name, email, resetLink);

    return NextResponse.json({
      user:      insert_users_one,
      emailSent: sent,
      resetLink,
      ...(emailError && { emailNote: emailError }),
    });

  } catch (err) {
    console.error('[api/users/create-department-person]', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}