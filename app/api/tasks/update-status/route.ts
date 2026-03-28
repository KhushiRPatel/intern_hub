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

const ACTIVITY = `mutation InsertActivity($object: task_activity_log_insert_input!) {
  insert_task_activity_log_one(object: $object) { id }
}`;

export async function POST(req: NextRequest) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role, departmentId } = getUserFromToken(authCheck.decoded);

    const { id, status, completed_date } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Task ID and status required' }, { status: 400 });
    }

    // ── Fetch task with current status ───────────────────────────────────────
    const taskData = await hasura<{
      tasks_by_pk: { id: string; department_id: string; status: string } | null
    }>(
      `query GetTask($id: uuid!) {
        tasks_by_pk(id: $id) { id department_id status }
      }`,
      { id },
    );
    const task = taskData.tasks_by_pk;
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // ── INTERN: write to task_interns.intern_status only ─────────────────────
    if (role === 'intern') {
      if (status !== 'completed') {
        logPermissionDenial(userId, role, 'update_task_status_non_complete');
        return NextResponse.json({ error: 'Interns can only mark their own completion' }, { status: 403 });
      }

      const internLookup = await hasura<{ interns: { id: string; name: string }[] }>(
        `query GetInternId($user_id: uuid!) {
          interns(where: { user_id: { _eq: $user_id } }, limit: 1) { id name }
        }`,
        { user_id: userId },
      );
      const intern = internLookup.interns[0];
      if (!intern) return NextResponse.json({ error: 'Intern record not found' }, { status: 403 });

      const assignCheck = await hasura<{ task_interns: { task_id: string; intern_status: string }[] }>(
        `query CheckAssignment($task_id: uuid!, $intern_id: uuid!) {
          task_interns(where: {
            task_id:   { _eq: $task_id },
            intern_id: { _eq: $intern_id }
          }) { task_id intern_status }
        }`,
        { task_id: id, intern_id: intern.id },
      );

      if (assignCheck.task_interns.length === 0) {
        logPermissionDenial(userId, role, 'update_task_status_not_assigned');
        return NextResponse.json({ error: 'You are not assigned to this task' }, { status: 403 });
      }

      const prevInternStatus = assignCheck.task_interns[0].intern_status;

      // ── Update intern_status ──────────────────────────────────────────────
      await hasura(
        `mutation UpdateInternTaskStatus($task_id: uuid!, $intern_id: uuid!, $intern_status: String!) {
          update_task_interns(
            where: { task_id: { _eq: $task_id }, intern_id: { _eq: $intern_id } }
            _set: { intern_status: $intern_status }
          ) { affected_rows }
        }`,
        { task_id: id, intern_id: intern.id, intern_status: 'completed' },
      );

      // ── Log activity after successful update ──────────────────────────────
      await hasura(ACTIVITY, {
        object: {
          task_id:   id,
          user_id:   userId,
          action:    'intern_marked_complete',
          old_value: prevInternStatus,
          new_value: 'completed',
        },
      });

      return NextResponse.json({ success: true, intern_status: 'completed' });
    }

    // ── ADMIN / DEPT_PERSON ──────────────────────────────────────────────────
    if (role === 'department_person' && task.department_id !== departmentId) {
      logPermissionDenial(userId, role, 'update_task_status_other_dept');
      return NextResponse.json({ error: 'Cannot update tasks in other departments' }, { status: 403 });
    }

    if (role !== 'admin' && role !== 'department_person') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const oldStatus      = task.status;
    const completionDate = status === 'completed'
      ? (completed_date || new Date().toISOString().split('T')[0])
      : null;

    // ── Update task status first ─────────────────────────────────────────────
    const result = await hasura<{
      update_tasks_by_pk: { id: string; status: string; completed_date: string; updated_at: string }
    }>(
      `mutation UpdateTaskStatus($id: uuid!, $set: tasks_set_input!) {
        update_tasks_by_pk(pk_columns: { id: $id }, _set: $set) {
          id status completed_date updated_at
        }
      }`,
      { id, set: { status, ...(completionDate && { completed_date: completionDate }) } },
    );

    // ── Log activity after successful update ─────────────────────────────────
    await hasura(ACTIVITY, {
      object: {
        task_id:   id,
        user_id:   userId,
        action:    'status_changed',
        old_value: oldStatus,
        new_value: status,
      },
    });

    return NextResponse.json({
      success:        true,
      status:         result.update_tasks_by_pk.status,
      completed_date: result.update_tasks_by_pk.completed_date,
    });
  } catch (err) {
    console.error('[api/tasks/update-status]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}