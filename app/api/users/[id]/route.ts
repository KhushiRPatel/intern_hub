import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, requireAdmin, getUserFromToken, logPermissionDenial } from '../../auth/utils';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN    = process.env.HASURA_ADMIN_SECRET || '';

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

// ── Simple email format guard ─────────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ── PATCH /api/users/[id] ───────────────────────────────────────────────────── */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role } = getUserFromToken(authCheck.decoded);
    const adminError = requireAdmin(authCheck.decoded);
    if (adminError) {
      logPermissionDenial(userId, role, 'update_department_person');
      return adminError;
    }

    const { id } = params;
    if (!id) return NextResponse.json({ message: 'Missing user ID' }, { status: 400 });

    const body = await req.json() as {
      name?: string; email?: string; phone?: string; department_id?: string;
    };

    // ── Input validation ──────────────────────────────────────────────────────
    if (body.name !== undefined && body.name.trim() === '') {
      return NextResponse.json({ message: 'Name cannot be empty' }, { status: 400 });
    }
    if (body.email !== undefined) {
      const trimmed = body.email.trim();
      if (trimmed === '' || !isValidEmail(trimmed)) {
        return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
      }
    }

    const set: Record<string, unknown> = {};
    if (body.name          !== undefined) set.name          = body.name.trim();
    if (body.email         !== undefined) set.email         = body.email.trim().toLowerCase();
    if (body.phone         !== undefined) set.phone         = body.phone?.trim() || null;
    if (body.department_id !== undefined) set.department_id = body.department_id;

    if (Object.keys(set).length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    // ── Verify target exists and is a dept_person ─────────────────────────────
    type UserCheck = { users_by_pk: { id: string; role: string } | null };
    const existing = await hasura<UserCheck>(
      `query CheckUser($id: uuid!) { users_by_pk(id: $id) { id role } }`,
      { id },
    );
    if (!existing.users_by_pk) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    if (existing.users_by_pk.role !== 'department_person') {
      return NextResponse.json({ message: 'User is not a department person' }, { status: 400 });
    }

    // ── If changing department, validate the new department exists ────────────
    if (set.department_id) {
      type DeptCheck = { departments_by_pk: { id: string; is_active: boolean } | null };
      const dept = await hasura<DeptCheck>(
        `query CheckDept($id: uuid!) { departments_by_pk(id: $id) { id is_active } }`,
        { id: set.department_id },
      );
      if (!dept.departments_by_pk) {
        return NextResponse.json({ message: 'Department not found' }, { status: 400 });
      }
      if (!dept.departments_by_pk.is_active) {
        return NextResponse.json({ message: 'Department is inactive' }, { status: 400 });
      }
    }

    type UpdateResult = { update_users_by_pk: { id: string; name: string; email: string } };
    const { update_users_by_pk } = await hasura<UpdateResult>(
      `mutation UpdateUser($id: uuid!, $set: users_set_input!) {
        update_users_by_pk(pk_columns: { id: $id }, _set: $set) { id name email }
      }`,
      { id, set },
    );

    return NextResponse.json({ user: update_users_by_pk });
  } catch (err) {
    // ── Catch duplicate email at DB level ─────────────────────────────────────
    const message = err instanceof Error ? err.message : 'Internal server error';
    const isDuplicate = message.toLowerCase().includes('unique') ||
                        message.toLowerCase().includes('duplicate');
    if (isDuplicate) {
      return NextResponse.json({ message: 'Email already in use' }, { status: 409 });
    }

    console.error('[api/users/[id] PATCH]', err);
    return NextResponse.json({ message }, { status: 500 });
  }
}

/* ── DELETE /api/users/[id] ──────────────────────────────────────────────────── */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role } = getUserFromToken(authCheck.decoded);
    const adminError = requireAdmin(authCheck.decoded);
    if (adminError) {
      logPermissionDenial(userId, role, 'delete_department_person');
      return adminError;
    }

    const { id } = params;
    if (!id) return NextResponse.json({ message: 'Missing user ID' }, { status: 400 });

    // ── Verify target exists and is a dept_person ─────────────────────────────
    type UserCheck = { users_by_pk: { id: string; role: string; name: string } | null };
    const existing = await hasura<UserCheck>(
      `query CheckUser($id: uuid!) { users_by_pk(id: $id) { id role name } }`,
      { id },
    );
    if (!existing.users_by_pk) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    if (existing.users_by_pk.role !== 'department_person') {
      return NextResponse.json({ message: 'Only department persons can be deleted via this endpoint' }, { status: 400 });
    }

    // ── FIX: Check for tasks assigned_by this user (assigned_by is NOT NULL) ──
    // We cannot nullify it, so we block deletion and tell the admin to reassign first.
    type TaskCheck = { tasks_aggregate: { aggregate: { count: number } } };
    const taskCheck = await hasura<TaskCheck>(
      `query CheckAssignedTasks($userId: uuid!) {
        tasks_aggregate(where: { assigned_by: { _eq: $userId } }) {
          aggregate { count }
        }
      }`,
      { userId: id },
    );

    const assignedCount = taskCheck.tasks_aggregate.aggregate.count;
    if (assignedCount > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete user: they are the assignor of ${assignedCount} task(s). Reassign or delete those tasks first.`,
          assigned_tasks_count: assignedCount,
        },
        { status: 409 },
      );
    }

    // ── Also check interns mentored by this user ──────────────────────────────
    type MentorCheck = { interns_aggregate: { aggregate: { count: number } } };
    const mentorCheck = await hasura<MentorCheck>(
      `query CheckMentoredInterns($userId: uuid!) {
        interns_aggregate(where: { mentor_id: { _eq: $userId } }) {
          aggregate { count }
        }
      }`,
      { userId: id },
    );

    const mentoredCount = mentorCheck.interns_aggregate.aggregate.count;
    if (mentoredCount > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete user: they are the mentor of ${mentoredCount} intern(s). Reassign mentors first.`,
          mentored_interns_count: mentoredCount,
        },
        { status: 409 },
      );
    }

    type DeleteResult = { delete_users_by_pk: { id: string; name: string } };
    const { delete_users_by_pk } = await hasura<DeleteResult>(
      `mutation DeleteUser($id: uuid!) {
        delete_users_by_pk(id: $id) { id name }
      }`,
      { id },
    );

    return NextResponse.json({ deleted: delete_users_by_pk });
  } catch (err) {
    console.error('[api/users/[id] DELETE]', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}