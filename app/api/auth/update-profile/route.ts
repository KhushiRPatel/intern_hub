import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getUserFromToken } from '@/app/api/auth/utils';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN    = process.env.HASURA_ADMIN_SECRET || '';

async function hasura<T = unknown>(query: string, variables: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(HASURA_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': HASURA_ADMIN },
      body:    JSON.stringify({ query, variables }),
    });
  } catch (networkErr) {
    throw new Error(`Cannot reach Hasura: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`);
  }

  let json: { data?: T; errors?: { message: string }[] };
  try {
    json = await res.json();
  } catch {
    throw new Error(`Hasura returned non-JSON response (HTTP ${res.status})`);
  }

  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

export async function PUT(req: NextRequest) {
  const auth = checkAuth(req);
  if (!auth.success) return auth.response!;

  try {
    const { userId, email } = getUserFromToken(auth.decoded!);

    const { name } = await req.json() as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const trimmedName = name.trim();

    if (HASURA_ADMIN) {
      // Step 1: find user by email to get their real DB id.
      // Use citext! in WHERE clause (Hasura accepts it for comparisons).
      const lookup = await hasura<{ users: { id: string }[] }>(
        `query FindUser($email: citext!) {
          users(where: { email: { _eq: $email } }, limit: 1) {
            id
          }
        }`,
        { email },
      );

      const dbId = lookup?.users?.[0]?.id;

      if (dbId) {
        // Step 2: user exists — update only the name column via update_users_by_pk
        await hasura(
          `mutation UpdateName($id: uuid!, $name: String!) {
            update_users_by_pk(pk_columns: { id: $id }, _set: { name: $name }) {
              id
              name
            }
          }`,
          { id: dbId, name: trimmedName },
        );
      }
      // If user not found in DB (demo user, upsert failed at login time):
      // We cannot INSERT without a password_hash (NOT NULL constraint).
      // The name is still saved to localStorage/context on the client side.
      // It will persist to the DB when the user sets a password via change-password.
    }

    return NextResponse.json({ success: true, name: trimmedName });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[update-profile]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
