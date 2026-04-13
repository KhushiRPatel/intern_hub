import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, requireAdmin, getUserFromToken, logPermissionDenial } from '../../../auth/utils';
import type { DepartmentAdminRow } from '../types';

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

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role } = getUserFromToken(authCheck.decoded);
    const adminError = requireAdmin(authCheck.decoded);
    if (adminError) {
      logPermissionDenial(userId, role, 'update_department');
      return adminError;
    }

    const { id } = await context.params;
    if (!id) return NextResponse.json({ message: 'Missing department id' }, { status: 400 });

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

    const set = {
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
      update_departments_by_pk: DepartmentAdminRow | null;
    }>(
      `
      mutation UpdateDepartment($id: uuid!, $set: departments_set_input!) {
        update_departments_by_pk(pk_columns: { id: $id }, _set: $set) {
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
      { id, set },
    );

    if (!data.update_departments_by_pk) {
      return NextResponse.json({ message: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json(data.update_departments_by_pk);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update department';
    const isUnique =
      msg.includes('duplicate key') || msg.includes('unique') || msg.includes('Uniqueness violation');
    return NextResponse.json({ message: msg }, { status: isUnique ? 409 : 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role } = getUserFromToken(authCheck.decoded);
    const adminError = requireAdmin(authCheck.decoded);
    if (adminError) {
      logPermissionDenial(userId, role, 'delete_department');
      return adminError;
    }

    const { id } = await context.params;
    if (!id) return NextResponse.json({ message: 'Missing department id' }, { status: 400 });

    const blockers = await hasura<{
      interns_aggregate: { aggregate: { count: number } | null };
      users_aggregate: { aggregate: { count: number } | null };
      tasks_aggregate: { aggregate: { count: number } | null };
    }>(
      `
      query DepartmentBlockers($id: uuid!) {
        interns_aggregate(where: { department_id: { _eq: $id } }) {
          aggregate { count }
        }
        users_aggregate(where: { department_id: { _eq: $id } }) {
          aggregate { count }
        }
        tasks_aggregate(where: { department_id: { _eq: $id } }) {
          aggregate { count }
        }
      }
    `,
      { id },
    );

    const iCount = blockers.interns_aggregate.aggregate?.count ?? 0;
    const uCount = blockers.users_aggregate.aggregate?.count ?? 0;
    const tCount = blockers.tasks_aggregate.aggregate?.count ?? 0;

    if (iCount > 0 || uCount > 0 || tCount > 0) {
      return NextResponse.json(
        {
          message:
            'Cannot delete this department while it still has interns, assigned users, or tasks. ' +
            'Reassign or remove them first.',
          counts: { interns: iCount, users: uCount, tasks: tCount },
        },
        { status: 409 },
      );
    }

    const del = await hasura<{ delete_departments_by_pk: { id: string } | null }>(
      `
      mutation DeleteDepartment($id: uuid!) {
        delete_departments_by_pk(id: $id) {
          id
        }
      }
    `,
      { id },
    );

    if (!del.delete_departments_by_pk) {
      return NextResponse.json({ message: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: del.delete_departments_by_pk.id });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to delete department' },
      { status: 500 },
    );
  }
}
