import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN = process.env.HASURA_ADMIN_SECRET || '';

async function hasura<T = unknown>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN,
        },
        body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message ?? 'Hasura error');
    return json.data as T;
}

function generateTempPassword(): string {
    const digits = Math.floor(1000 + Math.random() * 9000);
    return `Dept@${digits}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as {
            name: string;
            email: string;
            phone?: string;
            department_id: string;
        };

        const name = body?.name?.trim();
        const email = body?.email?.trim().toLowerCase();
        const phone = body?.phone?.trim() || null;
        const department_id = body?.department_id;

        if (!name || !email || !department_id) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // 1) Check if user already exists
        type UserCheck = { users: { id: string }[] };
        const existing = await hasura<UserCheck>(
            `query CheckEmail($email: citext!) {
              users(where: { email: { _eq: $email } }, limit: 1) { id }
            }`,
            { email }
        );

        if (existing.users.length > 0) {
            return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
        }

        // 2) Create user account
        const tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        type InsertUserResult = {
            insert_users_one: {
                id: string;
                name: string;
                email: string;
                role: string;
            };
        };

        const userResult = await hasura<InsertUserResult>(
            `mutation CreateDepartmentPerson($obj: users_insert_input!) {
              insert_users_one(object: $obj) {
                id name email role
              }
            }`,
            {
                obj: {
                    name,
                    email,
                    phone,
                    password_hash: passwordHash,
                    role: 'department_person',
                    department_id,
                },
            }
        );

        return NextResponse.json({
            user: userResult.insert_users_one,
            credentials: {
                email,
                tempPassword,
            },
        });
    } catch (err) {
        console.error('[api/users/create-department-person]', err);
        const message = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ message }, { status: 500 });
    }
}

