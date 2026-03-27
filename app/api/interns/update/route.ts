import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
    try {
        // Check authentication and authorization
        const authCheck = checkAuth(req);
        if (!authCheck.success || !authCheck.decoded) {
            return authCheck.response!;
        }

        const { userId, role } = getUserFromToken(authCheck.decoded);

        // Only admins can update interns
        const adminError = requireAdmin(authCheck.decoded);
        if (adminError) {
            logPermissionDenial(userId, role, 'update_intern');
            return adminError;
        }

        const body = await req.json();
        const { id, name, email, phone, college, degree, branch, department_id, start_date, end_date, status } = body as {
            id: string;
            name?: string;
            email?: string;
            phone?: string | null;
            college?: string;
            degree?: string;
            branch?: string;
            department_id?: string;
            start_date?: string;
            end_date?: string | null;
            status?: string;
        };

        if (!id) {
            return NextResponse.json({ message: 'Intern ID is required' }, { status: 400 });
        }

        // 1) Get the intern to find user_id
        type GetInternResult = {
            interns_by_pk: {
                id: string;
                user_id: string | null;
            } | null;
        };

        const internResult = await hasura<GetInternResult>(
            `query GetIntern($id: uuid!) {
                interns_by_pk(id: $id) {
                    id
                    user_id
                }
            }`,
            { id }
        );

        if (!internResult.interns_by_pk) {
            return NextResponse.json({ message: 'Intern not found' }, { status: 404 });
        }

        const user_id = internResult.interns_by_pk.user_id;

        // 2) Update intern record
        const internSet: Record<string, unknown> = {};
        if (name) internSet.name = name.trim();
        if (email) internSet.email = email.trim().toLowerCase();
        if (phone !== undefined) internSet.phone = phone;
        if (college) internSet.college = college.trim();
        if (degree) internSet.degree = degree.trim();
        if (branch) internSet.branch = branch.trim();
        if (department_id) internSet.department_id = department_id;
        if (start_date) internSet.start_date = start_date;
        if (end_date !== undefined) internSet.end_date = end_date;
        if (status) internSet.status = status;

        type UpdateInternResult = {
            update_interns_by_pk: {
                id: string;
                name: string;
            } | null;
        };

        const updatedIntern = await hasura<UpdateInternResult>(
            `mutation UpdateIntern($id: uuid!, $set: interns_set_input!) {
                update_interns_by_pk(pk_columns: { id: $id }, _set: $set) {
                    id
                    name
                }
            }`,
            { id, set: internSet }
        );

        // 3) Update user record if user_id exists
        if (user_id) {
            const userSet: Record<string, unknown> = {};
            if (name) userSet.name = name.trim();
            if (email) userSet.email = email.trim().toLowerCase();
            if (phone !== undefined) userSet.phone = phone;
            if (department_id) userSet.department_id = department_id;

            if (Object.keys(userSet).length > 0) {
                type UpdateUserResult = {
                    update_users_by_pk: {
                        id: string;
                    } | null;
                };

                await hasura<UpdateUserResult>(
                    `mutation UpdateUser($id: uuid!, $set: users_set_input!) {
                        update_users_by_pk(pk_columns: { id: $id }, _set: $set) {
                            id
                        }
                    }`,
                    { id: user_id, set: userSet }
                );
            }
        }

        return NextResponse.json({
            message: 'Intern updated successfully',
            intern: updatedIntern.update_interns_by_pk,
        });
    } catch (err) {
        console.error('[api/interns/update]', err);
        const message = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ message }, { status: 500 });
    }
}
