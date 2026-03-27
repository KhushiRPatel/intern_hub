import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getUserFromToken } from '../auth/utils';

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

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) {
      return authCheck.response!;
    }

    const { userId, role, departmentId } = getUserFromToken(authCheck.decoded);
    const { searchParams } = new URL(req.url);
    const requestedDepartmentId = searchParams.get('department_id');

    let query: string;
    let variables: Record<string, unknown>;

    // Build query based on role
    if (role === 'admin') {
      // Admin sees all interns, or filtered by department if specified
      if (requestedDepartmentId) {
        query = `
          query GetInternsByDepartment($department_id: uuid!) {
            interns(where: { department_id: { _eq: $department_id } }, order_by: { name: asc }) {
              id
              name
              email
              department_id
              created_at
              updated_at
            }
          }
        `;
        variables = { department_id: requestedDepartmentId };
      } else {
        query = `
          query GetAllInterns {
            interns(order_by: { name: asc }) {
              id
              name
              email
              department_id
              created_at
              updated_at
            }
          }
        `;
        variables = {};
      }
    } else if (role === 'department_person') {
      // Dept person sees only their department's interns
      if (requestedDepartmentId && requestedDepartmentId !== departmentId) {
        console.warn(`[AUTH] Permission denied - Dept person tried to access different department`);
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }

      query = `
        query GetInternsByDepartment($department_id: uuid!) {
          interns(where: { department_id: { _eq: $department_id } }, order_by: { name: asc }) {
            id
            name
            email
            department_id
            created_at
            updated_at
          }
        }
      `;
      variables = { department_id: departmentId };
    } else if (role === 'intern') {
      // Interns cannot list other interns
      console.warn(`[AUTH] Permission denied - Intern tried to list interns`);
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    } else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    }

    const data = await hasura<{ interns: any[] }>(query, variables);
    return NextResponse.json(data.interns);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch interns';
    return NextResponse.json({ message }, { status: 500 });
  }
}
