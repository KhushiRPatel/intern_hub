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

    const body = await req.json();
    const { id, intern_ids, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    // ── Fetch task for permission check ─────────────────────────────────────
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
        logPermissionDenial(userId, role, 'update_task_other_dept');
        return NextResponse.json({ error: 'Cannot update tasks in other departments' }, { status: 403 });
      }
    } else {
      // Interns: use update-status endpoint instead
      logPermissionDenial(userId, role, 'update_task_fields');
      return NextResponse.json(
        { error: 'Interns can only update task status. Use /api/tasks/update-status' },
        { status: 403 },
      );
    }

    // ── Update task fields ──────────────────────────────────────────────────
    const result = await hasura<{ update_tasks_by_pk: { id: string; title: string; status: string; priority: string; due_date: string; updated_at: string } }>(
      `mutation UpdateTask($id: uuid!, $set: tasks_set_input!) {
        update_tasks_by_pk(pk_columns: { id: $id }, _set: $set) {
          id title status priority due_date updated_at
        }
      }`,
      { id, set: updates },
    );

    // ── Update intern assignments if provided ───────────────────────────────
    if (Array.isArray(intern_ids)) {
      await hasura(
        `mutation DeleteTaskInterns($task_id: uuid!) {
          delete_task_interns(where: { task_id: { _eq: $task_id } }) { affected_rows }
        }`,
        { task_id: id },
      );

      if (intern_ids.length > 0) {
        await hasura(
          `mutation InsertTaskInterns($objects: [task_interns_insert_input!]!) {
            insert_task_interns(objects: $objects) { affected_rows }
          }`,
          { objects: intern_ids.map((internId: string) => ({ task_id: id, intern_id: internId })) },
        );

        // backward compat: keep intern_id = first intern
        await hasura(
          `mutation UpdateTaskIntern($id: uuid!, $intern_id: uuid!) {
            update_tasks_by_pk(pk_columns: { id: $id }, _set: { intern_id: $intern_id }) { id }
          }`,
          { id, intern_id: intern_ids[0] },
        );
      }
    }

    return NextResponse.json({ success: true, task: result.update_tasks_by_pk });
  } catch (err) {
    console.error('[api/tasks/update]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}