import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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
      cache:   'no-store',
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

export async function POST(req: NextRequest) {
  const auth = checkAuth(req);
  if (!auth.success) return auth.response!;

  try {
    const { userId, email, role, departmentId } = getUserFromToken(auth.decoded!);

    const { currentPassword, newPassword } = await req.json() as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    if (HASURA_ADMIN) {
      // Step 1: find user by email.
      // citext! works in WHERE comparison clauses.
      const lookup = await hasura<{ users: { id: string; name: string; password_hash: string | null }[] }>(
        `query FindUser($email: citext!) {
          users(where: { email: { _eq: $email } }, limit: 1) {
            id
            name
            password_hash
          }
        }`,
        { email },
      );

      const dbUser = lookup?.users?.[0];

      if (!dbUser) {
        // User not in DB — insert them now with the new password hash.
        // Use String! (not citext!) for the email value in the INSERT object —
        // that is what Hasura's schema expects for column values.
        const newHash = await bcrypt.hash(newPassword, 10);
        // Use citext! for email column, String! for name column — they are different types.
        // Do NOT reuse the same variable for both, that causes a type mismatch error.
        await hasura(
          `mutation InsertUser(
            $id: uuid!, $name: String!, $email: citext!,
            $role: String!, $dept: uuid, $hash: String!
          ) {
            insert_users_one(
              object: {
                id: $id, name: $name, email: $email,
                role: $role, department_id: $dept, password_hash: $hash
              }
              on_conflict: {
                constraint: users_pkey
                update_columns: [password_hash]
              }
            ) { id }
          }`,
          {
            id:   userId,
            name: String(email),  // JS string → String! (name column)
            email,                // JS string → citext! (email column)
            role,
            dept: departmentId || null,
            hash: newHash,
          },
        );
        return NextResponse.json({ success: true });
      }

      // Step 2: user found — verify current password if one is stored
      if (dbUser.password_hash) {
        const valid = await bcrypt.compare(currentPassword, dbUser.password_hash);
        if (!valid) {
          return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }
      }
      // No stored hash → first time setting a password, skip verification

      // Step 3: update password_hash using the real DB id
      const newHash = await bcrypt.hash(newPassword, 10);
      await hasura(
        `mutation SetPassword($id: uuid!, $hash: String!) {
          update_users_by_pk(pk_columns: { id: $id }, _set: { password_hash: $hash }) {
            id
          }
        }`,
        { id: dbUser.id, hash: newHash },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[change-password]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
