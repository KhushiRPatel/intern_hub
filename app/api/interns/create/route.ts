import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { checkAuth, requireAdmin, getUserFromToken, logPermissionDenial } from '../../auth/utils';

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
    return `Intern@${digits}`;
}

export async function POST(req: NextRequest) {
    try {
        // Check authentication and authorization
        const authCheck = checkAuth(req);
        if (!authCheck.success || !authCheck.decoded) {
            return authCheck.response!;
        }

        const { userId, role } = getUserFromToken(authCheck.decoded);

        // Only admins can create interns
        const adminError = requireAdmin(authCheck.decoded);
        if (adminError) {
            logPermissionDenial(userId, role, 'create_intern');
            return adminError;
        }

        const body = await req.json();
        const { name, email, phone, college, degree, branch, department_id, start_date, end_date, status } = body as {
            name: string;
            email: string;
            phone?: string | null;
            college: string;
            degree: string;
            branch: string;
            department_id: string;
            start_date: string;
            end_date?: string | null;
            status?: string;
        };

        if (!name || !email || !college || !degree || !branch || !department_id || !start_date) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // 1) Check if user already exists
        type UserCheck = { users: { id: string }[] };
        const existing = await hasura<UserCheck>(
            `query CheckEmail($email: citext!) {
                users(where: { email: { _eq: $email } }, limit: 1) { id }
            }`,
            { email: email.trim().toLowerCase() }
        );

        if (existing.users.length > 0) {
            return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
        }

        // 2) Create user
        const tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        type InsertUserResult = {
            insert_users_one: { id: string; name: string; email: string; role: string };
        };

        const userResult = await hasura<InsertUserResult>(
            `mutation CreateUser($obj: users_insert_input!) {
                insert_users_one(object: $obj) { id name email role }
            }`,
            {
                obj: {
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    phone: phone || null,
                    password_hash: passwordHash,
                    role: 'intern',
                    department_id,
                },
            }
        );

        const newUserId = userResult.insert_users_one.id;

        // 3) Create intern linked to user
        type InsertInternResult = {
            insert_interns_one: {
                id: string;
                name: string;
                email: string;
                status: string;
            };
        };

        const internResult = await hasura<InsertInternResult>(
            `mutation CreateIntern($obj: interns_insert_input!) {
                insert_interns_one(object: $obj) {
                    id name email status
                }
            }`,
            {
                obj: {
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    phone: phone || null,
                    college: college.trim(),
                    degree: degree.trim(),
                    branch: branch.trim(),
                    department_id,
                    start_date,
                    end_date: end_date || null,
                    status: status || 'active',
                    user_id: newUserId,
                },
            }
        );

        return NextResponse.json({
            intern: internResult.insert_interns_one,
            credentials: {
                email: email.trim().toLowerCase(),
                tempPassword,
            },
        });
    } catch (err) {
        console.error('[api/interns/create]', err);
        const message = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ message }, { status: 500 });
    }
}

