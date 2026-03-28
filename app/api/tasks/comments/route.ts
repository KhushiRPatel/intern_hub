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

// ── GET /api/tasks/comments?task_id=xxx ──────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;

    const task_id = req.nextUrl.searchParams.get('task_id');
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

    const data = await hasura<{
      task_comments: {
        id: string;
        comment: string;
        user_id: string;
        created_at: string;
        updated_at: string;
        user: { id: string; name: string; role: string };
      }[];
    }>(
      `query GetComments($task_id: uuid!) {
        task_comments(
          where: { task_id: { _eq: $task_id } }
          order_by: { created_at: asc }
        ) {
          id
          comment
          user_id
          created_at
          updated_at
          user { id name role }
        }
      }`,
      { task_id },
    );

    return NextResponse.json({ success: true, comments: data.task_comments });
  } catch (err) {
    console.error('[api/tasks/comments GET]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST /api/tasks/comments ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId } = getUserFromToken(authCheck.decoded);

    const { task_id, comment } = await req.json();
    if (!task_id || !comment?.trim()) {
      return NextResponse.json({ error: 'task_id and comment required' }, { status: 400 });
    }

    const data = await hasura<{
      insert_task_comments_one: {
        id: string;
        comment: string;
        user_id: string;
        created_at: string;
        user: { id: string; name: string; role: string };
      };
    }>(
      `mutation InsertComment($object: task_comments_insert_input!) {
        insert_task_comments_one(object: $object) {
          id comment user_id created_at
          user { id name role }
        }
      }`,
      { object: { task_id, comment: comment.trim(), user_id: userId } },
    );

    return NextResponse.json({ success: true, comment: data.insert_task_comments_one });
  } catch (err) {
    console.error('[api/tasks/comments POST]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}