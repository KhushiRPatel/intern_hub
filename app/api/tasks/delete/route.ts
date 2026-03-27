import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getUserFromToken, logPermissionDenial } from '../../auth/utils';

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

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role, departmentId } = getUserFromToken(authCheck.decoded);

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    // ── Fetch task ──────────────────────────────────────────────────────────
    const taskData = await hasura<{ tasks_by_pk: { id: string; department_id: string } | null }>(
      `query GetTask($id: uuid!) { tasks_by_pk(id: $id) { id department_id } }`,
      { id },
    );
    const task = taskData.tasks_by_pk;
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // ── Permission check ────────────────────────────────────────────────────
    if (role === 'admin') {
      // full access
    } else if (role === 'department_person') {
      if (task.department_id !== departmentId) {
        logPermissionDenial(userId, role, 'delete_task_other_dept');
        return NextResponse.json({ error: 'Cannot delete tasks in other departments' }, { status: 403 });
      }
    } else {
      logPermissionDenial(userId, role, 'delete_task');
      return NextResponse.json({ error: 'Interns cannot delete tasks' }, { status: 403 });
    }

    // ── Delete (task_interns cascade via FK) ────────────────────────────────
    await hasura(
      `mutation DeleteTask($id: uuid!) {
        delete_tasks_by_pk(id: $id) { id title }
      }`,
      { id },
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/tasks/delete]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}