import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, requireAdmin, getUserFromToken, logPermissionDenial } from '../../auth/utils';
import type { DepartmentAdminRow } from './types';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN = process.env.HASURA_ADMIN_SECRET || '';

async function hasura<T = unknown>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': HASURA_ADMIN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'Hasura error');
  return json.data as T;
}

const LIST_QUERY = `
  query AdminDepartments {
    departments(order_by: { name: asc }) {
      id
      name
      code
      description
      head_name
      head_email
      location
      max_interns
      is_active
      created_at
      updated_at
      users(where: { role: { _eq: "department_person" } }, order_by: { name: asc }) {
        id
        name
        email
        phone
        is_active
      }
    }
  }
`;

export async function GET(req: NextRequest) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role } = getUserFromToken(authCheck.decoded);
    const adminError = requireAdmin(authCheck.decoded);
    if (adminError) {
      logPermissionDenial(userId, role, 'list_departments_admin');
      return adminError;
    }

    const data = await hasura<{ departments: DepartmentAdminRow[] }>(LIST_QUERY, {});
    return NextResponse.json(data.departments);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to fetch departments' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role } = getUserFromToken(authCheck.decoded);
    const adminError = requireAdmin(authCheck.decoded);
    if (adminError) {
      logPermissionDenial(userId, role, 'create_department');
      return adminError;
    }

    const body = (await req.json()) as {
      name?: string;
      code?: string;
      description?: string | null;
      head_name?: string | null;
      head_email?: string | null;
      location?: string | null;
      max_interns?: number | null;
      is_active?: boolean | null;
    };

    const name = body.name?.trim();
    const code = body.code?.trim();
    if (!name || !code) {
      return NextResponse.json({ message: 'Name and code are required' }, { status: 400 });
    }

    const object = {
      name,
      code,
      description: body.description?.trim() || null,
      head_name: body.head_name?.trim() || null,
      head_email: body.head_email?.trim() || null,
      location: body.location?.trim() || null,
      max_interns: typeof body.max_interns === 'number' && body.max_interns > 0 ? body.max_interns : 20,
      is_active: body.is_active !== false,
    };

    const data = await hasura<{
      insert_departments_one: DepartmentAdminRow | null;
    }>(
      `
      mutation InsertDepartment($object: departments_insert_input!) {
        insert_departments_one(object: $object) {
          id
          name
          code
          description
          head_name
          head_email
          location
          max_interns
          is_active
          created_at
          updated_at
          users(where: { role: { _eq: "department_person" } }, order_by: { name: asc }) {
            id
            name
            email
            phone
            is_active
          }
        }
      }
    `,
      { object },
    );

    if (!data.insert_departments_one) {
      return NextResponse.json({ message: 'Failed to create department' }, { status: 500 });
    }

    return NextResponse.json(data.insert_departments_one, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create department';
    const isUnique =
      msg.includes('duplicate key') || msg.includes('unique') || msg.includes('Uniqueness violation');
    return NextResponse.json({ message: msg }, { status: isUnique ? 409 : 500 });
  }
}
