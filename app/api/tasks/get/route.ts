import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getUserFromToken } from '../../auth/utils';

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

export async function GET(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role, departmentId } = getUserFromToken(authCheck.decoded);

    // ── Build where clause by role ──────────────────────────────────────────
    // Admin  → all tasks
    // Dept   → tasks in their department
    // Intern → tasks assigned to them via task_interns (matched by intern_id,
    //          NOT user_id — the two are different UUIDs)
    let where: Record<string, unknown> = {};

    if (role === 'admin') {
      where = {};
    } else if (role === 'department_person') {
      where = { department_id: { _eq: departmentId } };
    } else if (role === 'intern') {
      // FIX: use intern_id from UserData, not userId (which is the users.id)
      // The token carries x-hasura-user-id = users.id, but task_interns stores
      // interns.id. We resolve the intern record first.
      const internLookup = await hasura<{ interns: { id: string }[] }>(
        `query GetInternId($user_id: uuid!) {
          interns(where: { user_id: { _eq: $user_id } }, limit: 1) { id }
        }`,
        { user_id: userId },
      );
      const internId = internLookup.interns[0]?.id;
      if (!internId) return NextResponse.json({ success: true, tasks: [] });
      where = { task_interns: { intern_id: { _eq: internId } } };
    }

    // ── Fetch tasks ─────────────────────────────────────────────────────────
    const tasksData = await hasura<{ tasks: Record<string, unknown>[] }>(
      `query GetTasks($where: tasks_bool_exp) {
        tasks(where: $where, order_by: [{ due_date: asc }, { created_at: desc }]) {
          id title description priority status
          due_date start_date completed_date estimated_hours
          intern_id assigned_by assigned_to department_id
          tags notes created_at updated_at
        }
      }`,
      { where },
    );

    // ── Fetch task_interns map ──────────────────────────────────────────────
    const tiData = await hasura<{
      task_interns: { task_id: string; intern_id: string; intern_status: string }[]
    }>(
      `query GetTaskInterns { task_interns { task_id intern_id intern_status } }`,
      {},
    );

    // Map: task_id → { intern_ids, intern_statuses }
    const tiMap = new Map<string, { ids: string[]; statuses: Record<string, string> }>();
    for (const ti of tiData.task_interns) {
      if (!tiMap.has(ti.task_id)) tiMap.set(ti.task_id, { ids: [], statuses: {} });
      const entry = tiMap.get(ti.task_id)!;
      entry.ids.push(ti.intern_id);
      entry.statuses[ti.intern_id] = ti.intern_status;
    }

    // For interns: resolve their interns.id to attach their own intern_status
    let currentInternId: string | undefined;
    if (role === 'intern') {
      const internLookup = await hasura<{ interns: { id: string }[] }>(
        `query GetInternId($user_id: uuid!) {
          interns(where: { user_id: { _eq: $user_id } }, limit: 1) { id }
        }`,
        { user_id: userId },
      );
      currentInternId = internLookup.interns[0]?.id;
    }

    const tasks = tasksData.tasks.map(task => {
      const entry      = tiMap.get(task.id as string);
      const intern_ids = entry?.ids ?? (task.intern_id ? [task.intern_id as string] : []);
      // my_intern_status: the current intern's personal completion on this task
      const my_intern_status = currentInternId
        ? (entry?.statuses[currentInternId] ?? 'pending')
        : undefined;
      return { ...task, intern_ids, intern_statuses: entry?.statuses ?? {}, my_intern_status };
    });

    return NextResponse.json({ success: true, tasks });
  } catch (err) {
    console.error('[api/tasks/get]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}