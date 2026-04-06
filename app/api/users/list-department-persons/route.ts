import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, requireAdmin, getUserFromToken, logPermissionDenial } from '../../auth/utils';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN = process.env.HASURA_ADMIN_SECRET || '';

export async function GET(req: NextRequest) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role } = getUserFromToken(authCheck.decoded);
    const adminError = requireAdmin(authCheck.decoded);
    if (adminError) {
      logPermissionDenial(userId, role, 'list_department_persons');
      return adminError;
    }

    const res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN,
      },
      body: JSON.stringify({
        query: `
          query ListDepartmentPersons {
            users(
              where: { role: { _eq: "department_person" } }
              order_by: { name: asc }
            ) {
              id
              name
              email
              role
              department_id
              department {
                id
                name
              }
            }
          }
        `,
        variables: {},
      }),
    });

    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message ?? 'Hasura error');

    return NextResponse.json(json.data.users);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to fetch department persons' },
      { status: 500 },
    );
  }
}
