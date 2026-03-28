import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getUserFromToken, logPermissionDenial } from '../../auth/utils';

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

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role, departmentId } = getUserFromToken(authCheck.decoded);

    const { id, status, completed_date } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Task ID and status required' }, { status: 400 });
    }

    // ── Fetch task ──────────────────────────────────────────────────────────
    const taskData = await hasura<{ tasks_by_pk: { id: string; department_id: string } | null }>(
      `query GetTask($id: uuid!) { tasks_by_pk(id: $id) { id department_id } }`,
      { id },
    );
    const task = taskData.tasks_by_pk;
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // ── Permission check + route by role ────────────────────────────────────
    if (role === 'admin') {
      // Admin: update tasks.status directly
      if (task.department_id !== departmentId && role !== 'admin') {
        logPermissionDenial(userId, role, 'update_task_status_other_dept');
        return NextResponse.json({ error: 'Cannot update tasks in other departments' }, { status: 403 });
      }
    } else if (role === 'department_person') {
      // Dept person: update tasks.status for own department
      if (task.department_id !== departmentId) {
        logPermissionDenial(userId, role, 'update_task_status_other_dept');
        return NextResponse.json({ error: 'Cannot update tasks in other departments' }, { status: 403 });
      }
    } else if (role === 'intern') {
      // ── INTERN: writes to task_interns.intern_status, NOT tasks.status ────
      if (status !== 'completed') {
        logPermissionDenial(userId, role, 'update_task_status_non_complete');
        return NextResponse.json({ error: 'Interns can only mark their own completion' }, { status: 403 });
      }

      // Resolve interns.id from users.id
      const internLookup = await hasura<{ interns: { id: string }[] }>(
        `query GetInternId($user_id: uuid!) {
          interns(where: { user_id: { _eq: $user_id } }, limit: 1) { id }
        }`,
        { user_id: userId },
      );
      const internId = internLookup.interns[0]?.id;
      if (!internId) {
        return NextResponse.json({ error: 'Intern record not found' }, { status: 403 });
      }

      // Verify assigned
      const assignCheck = await hasura<{ task_interns: { task_id: string }[] }>(
        `query CheckAssignment($task_id: uuid!, $intern_id: uuid!) {
          task_interns(where: {
            task_id:   { _eq: $task_id },
            intern_id: { _eq: $intern_id }
          }) { task_id }
        }`,
        { task_id: id, intern_id: internId },
      );
      if (assignCheck.task_interns.length === 0) {
        logPermissionDenial(userId, role, 'update_task_status_not_assigned');
        return NextResponse.json({ error: 'You are not assigned to this task' }, { status: 403 });
      }

      // Write intern_status on the junction row only — tasks.status unchanged
      await hasura(
        `mutation UpdateInternTaskStatus($task_id: uuid!, $intern_id: uuid!, $intern_status: String!) {
          update_task_interns(
            where: {
              task_id:   { _eq: $task_id },
              intern_id: { _eq: $intern_id }
            }
            _set: { intern_status: $intern_status }
          ) { affected_rows }
        }`,
        { task_id: id, intern_id: internId, intern_status: 'completed' },
      );

      return NextResponse.json({ success: true, intern_status: 'completed' });
    } else {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // ── Admin / dept_person: update tasks.status ────────────────────────────
    const completionDate = status === 'completed'
      ? (completed_date || new Date().toISOString().split('T')[0])
      : null;
  
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
    
    // after status is changed — most useful one
    await hasura(`mutation InsertActivity($object: task_activity_log_insert_input!) {
  insert_task_activity_log_one(object: $object) { id }
}`, {
      object: {
        task_id: id,
        user_id: userId,
        action: 'status_changed',
        old_value: task.status,       // fetch old status before updating
        new_value: status,
      }
    });




    return NextResponse.json({
      success: true,
      status: result.update_tasks_by_pk.status,
      completed_date: result.update_tasks_by_pk.completed_date,
    });
  } catch (err) {
    console.error('[api/tasks/update-status]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}