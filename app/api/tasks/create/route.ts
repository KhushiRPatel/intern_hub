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
    // ── Auth (FIX: was using jwt.decode — no verification!) ─────────────────
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role, departmentId } = getUserFromToken(authCheck.decoded);

    // ── Permission: only admin and dept_person can create ───────────────────
    if (role !== 'admin' && role !== 'department_person') {
      logPermissionDenial(userId, role, 'create_task');
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, priority, status, intern_ids, department_id,
            due_date, start_date, estimated_hours, tags, notes } = body;

    if (!title || !Array.isArray(intern_ids) || intern_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: title and at least one intern' },
        { status: 400 },
      );
    }

    // ── Dept person can only create for their own department ────────────────
    if (role === 'department_person' && department_id !== departmentId) {
      logPermissionDenial(userId, role, 'create_task_other_dept');
      return NextResponse.json({ error: 'Cannot create tasks in other departments' }, { status: 403 });
    }

    // ── Resolve the real DB user id for assigned_by FK ──────────────────────
    // The token's userId may differ from the DB id (e.g. demo users seeded by
    // init.sql get a different UUID than the hardcoded demo login IDs).
    // Always look up by email — the unique key that never mismatches.
    const { decoded } = authCheck;
    const tokenEmail  = (decoded as any).email as string;

    const dbUserData = await hasura<{ users: { id: string }[] }>(
      `query GetUserByEmail($email: citext!) {
        users(where: { email: { _eq: $email } }, limit: 1) { id }
      }`,
      { email: tokenEmail },
    );

    // If not found, insert fresh (first-time demo user not yet in DB)
    let realUserId = dbUserData.users?.[0]?.id;
    if (!realUserId) {
      const inserted = await hasura<{ insert_users_one: { id: string } }>(
        `mutation InsertUser($id: uuid!, $name: String!, $email: citext!, $role: String!, $dept: uuid) {
          insert_users_one(
            object: { id: $id, name: $name, email: $email, role: $role, password_hash: "pending-set-via-email", department_id: $dept }
            on_conflict: { constraint: users_email_key, update_columns: [] }
          ) { id }
        }`,
        {
          id:    userId,
          name:  (decoded as any).name ?? 'Unknown',
          email: tokenEmail,
          role,
          dept:  departmentId || null,
        },
      );
      realUserId = inserted.insert_users_one?.id ?? userId;
    }

    // ── Create task ─────────────────────────────────────────────────────────
    const taskData = await hasura<{ insert_tasks_one: { id: string; title: string; status: string; priority: string; due_date: string } }>(
      `mutation InsertTask($obj: tasks_insert_input!) {
        insert_tasks_one(object: $obj) { id title status priority due_date }
      }`,
      {
        obj: {
          title,
          description:     description || null,
          priority:        priority || 'medium',
          status:          status || 'open',
          intern_id:       intern_ids[0] || null, // backward compat
          assigned_by:     realUserId, // ← real DB id, not token id
          department_id,
          due_date:        due_date || null,
          start_date:      start_date || new Date().toISOString().split('T')[0],
          estimated_hours: estimated_hours || null,
          tags:            tags?.length ? tags : null,
          notes:           notes || null,
        },
      },
    );

    const taskId = taskData.insert_tasks_one.id;

    // ── Link all interns via task_interns ───────────────────────────────────
    await hasura(
      `mutation InsertTaskInterns($objects: [task_interns_insert_input!]!) {
        insert_task_interns(objects: $objects) { affected_rows }
      }`,
      { objects: intern_ids.map((internId: string) => ({ task_id: taskId, intern_id: internId })) },
    );

    return NextResponse.json({ success: true, task: taskData.insert_tasks_one });
  } catch (err) {
    console.error('[api/tasks/create]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}