import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';
const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN = process.env.HASURA_ADMIN_SECRET || '';

// ── Demo users (fallback when Hasura is not running) ─────────────────────────
const DEMO_USERS = [
    {
        id: 'a1b2c3d4-0001-0001-0001-000000000001',
        name: 'System Admin',
        email: 'admin@company.com',
        password: 'admin123',
        role: 'admin' as const,
        department_id: null,
        department_name: null,
    },
    {
        id: 'a1b2c3d4-0002-0002-0002-000000000002',
        name: 'Raj Mehta (AI)',
        email: 'raj.ai@company.com',
        password: 'dept123',
        role: 'department_person' as const,
        department_id: 'dept-ai-001',
        department_name: 'AI',
    },
    {
        id: 'a1b2c3d4-0003-0003-0003-000000000003',
        name: 'Priya Nair (PHP)',
        email: 'priya.php@company.com',
        password: 'dept123',
        role: 'department_person' as const,
        department_id: 'dept-php-001',
        department_name: 'PHP',
    },
    {
        id: 'a1b2c3d4-0004-0004-0004-000000000004',
        name: 'John Intern',
        email: 'john.intern@student.com',
        password: 'intern123',
        role: 'intern' as const,
        department_id: 'dept-ai-001',
        department_name: 'AI',
    },
];

// ── Helper: query Hasura for user by email ────────────────────────────────────
async function fetchUserFromHasura(email: string) {
    if (!HASURA_ADMIN) return null;
    try {
        const res = await fetch(HASURA_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hasura-admin-secret': HASURA_ADMIN,
            },
            body: JSON.stringify({
                query: `
          query GetUser($email: citext!) {
            users(where: { email: { _eq: $email } }, limit: 1) {
              id name email password_hash role department_id
              department { name }
            }
          }
        `,
                variables: { email },
            }),
        });
        const json = await res.json();
        return json?.data?.users?.[0] ?? null;
    } catch {
        return null; // Hasura not available
    }
}

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Sanitise inputs (basic guard against injection)
        const safeEmail = String(email).trim().toLowerCase().slice(0, 254);

        let authenticated: {
            id: string; name: string; email: string;
            role: 'admin' | 'department_person' | 'intern';
            department_id: string | null; department_name: string | null;
        } | null = null;

        // 1️⃣ Try Hasura with hashed password
        const dbUser = await fetchUserFromHasura(safeEmail);
        if (dbUser) {
            const valid = await bcrypt.compare(String(password), dbUser.password_hash);
            if (valid) {
                authenticated = {
                    id: dbUser.id,
                    name: dbUser.name,
                    email: dbUser.email,
                    role: dbUser.role,
                    department_id: dbUser.department_id ?? null,
                    department_name: dbUser.department?.name ?? null,
                };
            }
        }

        // 2️⃣ Fall back to demo users
        if (!authenticated) {
            const demo = DEMO_USERS.find(
                (u) => u.email === safeEmail && u.password === String(password)
            );
            if (demo) {
                authenticated = {
                    id: demo.id,
                    name: demo.name,
                    email: demo.email,
                    role: demo.role,
                    department_id: demo.department_id,
                    department_name: demo.department_name,
                };
            }
        }

        if (!authenticated) {
            return NextResponse.json(
                { message: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // ── Build JWT with Hasura-compatible claims ───────────────────────────────
        const token = jwt.sign(
            {
                sub: authenticated.id,
                name: authenticated.name,
                email: authenticated.email,
                role: authenticated.role,
                'https://hasura.io/jwt/claims': {
                    'x-hasura-allowed-roles': [authenticated.role],
                    'x-hasura-default-role': authenticated.role,
                    'x-hasura-user-id': authenticated.id,
                    'x-hasura-dept-id': authenticated.department_id ?? '',
                },
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return NextResponse.json({ token, user: authenticated });
    } catch (err) {
        console.error('[auth/login]', err);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
