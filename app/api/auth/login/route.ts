import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET      = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN    = process.env.HASURA_ADMIN_SECRET || '';

const DEMO_USERS = [
  { id: 'a1b2c3d4-0001-0001-0001-000000000001', name: 'System Admin',      email: 'admin@company.com',       password: 'admin123', role: 'admin'             as const, department_id: null,           department_name: null   },
  { id: 'a1b2c3d4-0002-0002-0002-000000000002', name: 'Raj Mehta (AI)',    email: 'raj.ai@company.com',      password: 'dept123',  role: 'department_person' as const, department_id: 'dept-ai-001',  department_name: 'AI'   },
  { id: 'a1b2c3d4-0003-0003-0003-000000000003', name: 'Priya Nair (PHP)',  email: 'priya.php@company.com',   password: 'dept123',  role: 'department_person' as const, department_id: 'dept-php-001', department_name: 'PHP'  },
  { id: 'a1b2c3d4-0004-0004-0004-000000000004', name: 'John Intern',       email: 'john.intern@student.com', password: 'intern123',role: 'intern'             as const, department_id: 'dept-ai-001',  department_name: 'AI'   },
];

async function hasura<T = unknown>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!HASURA_ADMIN) return {} as T;
  try {
    const res  = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': HASURA_ADMIN },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data as T;
  } catch (err) {
    console.error('[auth/login] Hasura error:', err);
    return {} as T;
  }
}

async function fetchUserFromHasura(email: string) {
  const data = await hasura<{ users: any[] }>(
    `query GetUser($email: citext!) {
      users(where: { email: { _eq: $email } }, limit: 1) {
        id name email password_hash role department_id
        department { name }
      }
    }`,
    { email },
  );
  return data?.users?.[0] ?? null;
}

// ── Upsert user so FK constraints (assigned_by, etc.) always resolve ─────────
// Called for BOTH real Hasura users and demo users on every login.
async function upsertUser(u: {
  id: string; name: string; email: string;
  role: string; department_id: string | null;
}) {
  if (!HASURA_ADMIN) return;
  await hasura(
    `mutation UpsertUser(
      $id: uuid!, $name: String!, $email: citext!,
      $role: String!, $department_id: uuid
    ) {
      insert_users_one(
        object: { id: $id, name: $name, email: $email, role: $role, department_id: $department_id }
        on_conflict: {
          constraint: users_pkey
          update_columns: [name, role, department_id]
        }
      ) { id }
    }`,
    { id: u.id, name: u.name, email: u.email, role: u.role, department_id: u.department_id },
  );
}

// ── Resolve intern_id for intern users (interns.id ≠ users.id) ──────────────
async function fetchInternId(userId: string): Promise<string | undefined> {
  const data = await hasura<{ interns: { id: string }[] }>(
    `query GetInternId($user_id: uuid!) {
      interns(where: { user_id: { _eq: $user_id } }, limit: 1) { id }
    }`,
    { user_id: userId },
  );
  return data?.interns?.[0]?.id;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const safeEmail = String(email).trim().toLowerCase().slice(0, 254);

    type Authenticated = {
      id: string; name: string; email: string;
      role: 'admin' | 'department_person' | 'intern';
      department_id: string | null; department_name: string | null;
    };
    let authenticated: Authenticated | null = null;

    // ── 1. Try Hasura (real users with hashed passwords) ─────────────────────
    const dbUser = await fetchUserFromHasura(safeEmail);
    if (dbUser) {
      const valid = await bcrypt.compare(String(password), dbUser.password_hash);
      if (valid) {
        authenticated = {
          id:              dbUser.id,
          name:            dbUser.name,
          email:           dbUser.email,
          role:            dbUser.role,
          department_id:   dbUser.department_id ?? null,
          department_name: dbUser.department?.name ?? null,
        };
        // ✅ FIX: upsert real Hasura users too so assigned_by FK never breaks
        await upsertUser({
          id:            authenticated.id,
          name:          authenticated.name,
          email:         authenticated.email,
          role:          authenticated.role,
          department_id: authenticated.department_id,
        });
      }
    }

    // ── 2. Fall back to demo users ────────────────────────────────────────────
    if (!authenticated) {
      const demo = DEMO_USERS.find(u => u.email === safeEmail && u.password === String(password));
      if (demo) {
        // Look up the real DB id by email first — init.sql seeds users with
        // gen_random_uuid() so the hardcoded demo IDs never match the DB.
        const existing = await fetchUserFromHasura(safeEmail);
        const realId   = existing?.id ?? demo.id;

        authenticated = {
          id:              realId,   // ← real DB uuid, not hardcoded
          name:            demo.name,
          email:           demo.email,
          role:            demo.role,
          department_id:   demo.department_id,
          department_name: demo.department_name,
        };
        // Upsert with the real id so the record definitely exists
        await upsertUser({
          id:            realId,
          name:          demo.name,
          email:         demo.email,
          role:          demo.role,
          department_id: demo.department_id,
        });
      }
    }

    if (!authenticated) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // ── 3. Resolve intern_id for intern users ─────────────────────────────────
    // intern_id = interns.id (different from users.id)
    // Stored in the JWT and UserData so the frontend can match task assignments
    let intern_id: string | undefined;
    if (authenticated.role === 'intern') {
      intern_id = await fetchInternId(authenticated.id);
    }

    // ── 4. Build JWT ──────────────────────────────────────────────────────────
    const token = jwt.sign(
      {
        sub:   authenticated.id,
        name:  authenticated.name,
        email: authenticated.email,
        role:  authenticated.role,
        'https://hasura.io/jwt/claims': {
          'x-hasura-allowed-roles': [authenticated.role],
          'x-hasura-default-role':  authenticated.role,
          'x-hasura-user-id':       authenticated.id,
          'x-hasura-role':          authenticated.role,
          'x-hasura-department-id': authenticated.department_id ?? '',
        },
      },
      JWT_SECRET,
      { expiresIn: '8h' },
    );

    // ── 5. Return token + full UserData (including intern_id) ─────────────────
    return NextResponse.json({
      token,
      user: {
        id:              authenticated.id,
        name:            authenticated.name,
        email:           authenticated.email,
        role:            authenticated.role,
        department_id:   authenticated.department_id,
        department_name: authenticated.department_name,
        ...(intern_id && { intern_id }), // only set for interns
      },
    });

  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}