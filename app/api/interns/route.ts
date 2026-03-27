import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getUserFromToken } from '../auth/utils';

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

const INTERN_FIELDS = `
  id name email phone college degree branch
  department_id department { id name }
  start_date end_date status user_id created_at
`;

export async function GET(req: NextRequest) {
  try {
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role, departmentId } = getUserFromToken(authCheck.decoded);

    const { searchParams } = new URL(req.url);
    const requestedDeptId = searchParams.get('department_id');
    const search          = searchParams.get('search');
    const college         = searchParams.get('college');
    const status          = searchParams.get('status');

    // Build where conditions as an array then join with commas
    const conditions: string[] = [];

    if (role === 'intern') {
      conditions.push(`user_id: { _eq: "${userId}" }`);
    } else if (role === 'department_person') {
      if (requestedDeptId && requestedDeptId !== departmentId) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
      conditions.push(`department_id: { _eq: "${departmentId}" }`);
    } else if (role === 'admin') {
      if (requestedDeptId) conditions.push(`department_id: { _eq: "${requestedDeptId}" }`);
    }

    if (search)  conditions.push(`name: { _ilike: "%${search.replace(/"/g, '')}%" }`);
    if (college) conditions.push(`college: { _ilike: "%${college.replace(/"/g, '')}%" }`);
    if (status)  conditions.push(`status: { _eq: "${status.replace(/"/g, '')}" }`);

    const where = conditions.length > 0 ? `where: { ${conditions.join(', ')} }` : '';

    const data = await hasura<{ interns: unknown[] }>(
      `query { interns(${where} order_by: { created_at: desc }) { ${INTERN_FIELDS} } }`,
      {},
    );
    return NextResponse.json(data.interns);
  } catch (err) {
    console.error('[api/interns GET]', err);
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}