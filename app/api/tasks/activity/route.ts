import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '../../auth/utils';

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

// ── GET /api/tasks/activity?task_id=xxx ──────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;

    const task_id = req.nextUrl.searchParams.get('task_id');
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

    const data = await hasura<{
      task_activity_log: {
        id: string;
        action: string;
        old_value: string | null;
        new_value: string | null;
        user_id: string;
        created_at: string;
        user: { id: string; name: string; role: string };
      }[];
    }>(
      `query GetActivity($task_id: uuid!) {
        task_activity_log(
          where: { task_id: { _eq: $task_id } }
          order_by: { created_at: desc }
        ) {
          id action old_value new_value user_id created_at
          user { id name role }
        }
      }`,
      { task_id },
    );

    return NextResponse.json({ success: true, activity: data.task_activity_log });
  } catch (err) {
    console.error('[api/tasks/activity GET]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}