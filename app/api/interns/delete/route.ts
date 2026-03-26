import { NextRequest, NextResponse } from 'next/server';

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
        const body = await req.json();
        const { id } = body as { id: string };

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

        // 2) Delete intern record FIRST (because of foreign key constraint)
        type DeleteInternResult = {
            delete_interns_by_pk: {
                id: string;
                name: string;
            } | null;
        };

        const deletedIntern = await hasura<DeleteInternResult>(
            `mutation DeleteIntern($id: uuid!) {
                delete_interns_by_pk(id: $id) {
                    id
                    name
                }
            }`,
            { id }
        );

        // 3) Delete user record if user_id exists
        if (user_id) {
            type DeleteUserResult = {
                delete_users_by_pk: {
                    id: string;
                } | null;
            };

            await hasura<DeleteUserResult>(
                `mutation DeleteUser($id: uuid!) {
                    delete_users_by_pk(id: $id) {
                        id
                    }
                }`,
                { id: user_id }
            );
        }

        return NextResponse.json({
            message: 'Intern deleted successfully',
            intern: deletedIntern.delete_interns_by_pk,
        });
    } catch (err) {
        console.error('[api/interns/delete]', err);
        const message = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ message }, { status: 500 });
    }
}
