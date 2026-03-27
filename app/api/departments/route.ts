import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '../auth/utils';

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
    const authCheck = checkAuth(req);
    if (!authCheck.success) return authCheck.response!;

    const data = await hasura<{ departments: { id: string; name: string }[] }>(
      `query GetDepartments {
        departments(order_by: { name: asc }) { id name }
      }`,
      {},
    );
    return NextResponse.json(data.departments);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to fetch departments' },
      { status: 500 },
    );
  }
}