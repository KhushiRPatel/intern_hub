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

// Fields an intern is allowed to update on their own record
const INTERN_ALLOWED_FIELDS = new Set(['phone', 'linkedin_url', 'github_url', 'portfolio_url', 'address_line1', 'address_line2', 'city', 'state', 'pincode']);

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authCheck = checkAuth(req);
    if (!authCheck.success || !authCheck.decoded) return authCheck.response!;
    const { userId, role, departmentId } = getUserFromToken(authCheck.decoded);

    const body = await req.json();
    const {
      id,
      name,
      email,
      phone,
      alternate_phone,
      college,
      university,
      college_email,
      degree,
      branch,
      specialization,
      graduation_year,
      department_id,
      start_date,
      end_date,
      status,
      ...extraFields
    } = body;

    if (!id) return NextResponse.json({ message: 'Intern ID is required' }, { status: 400 });

    // ── Fetch intern to check ownership and department ──────────────────────
    const internData = await hasura<{
      interns_by_pk: { id: string; user_id: string | null; department_id: string } | null
    }>(
      `query GetIntern($id: uuid!) {
        interns_by_pk(id: $id) { id user_id department_id }
      }`,
      { id },
    );
    const intern = internData.interns_by_pk;
    if (!intern) return NextResponse.json({ message: 'Intern not found' }, { status: 404 });

    // ── Permission check + field scoping ────────────────────────────────────
    let internSet: Record<string, unknown> = {};
    let userSet:   Record<string, unknown> = {};

    if (role === 'admin') {
      // Full update
      if (name)            { internSet.name = name.trim();                    userSet.name = name.trim(); }
      if (email)           { internSet.email = email.trim().toLowerCase();    userSet.email = email.trim().toLowerCase(); }
      if (phone !== undefined) { internSet.phone = phone;                     userSet.phone = phone; }
      if (alternate_phone !== undefined) {
        internSet.alternate_phone = typeof alternate_phone === 'string' && alternate_phone.trim()
          ? alternate_phone.trim()
          : null;
      }
      if (college)         internSet.college       = college.trim();
      if (university !== undefined) {
        internSet.university = typeof university === 'string' && university.trim() ? university.trim() : null;
      }
      if (college_email !== undefined) {
        const ce = typeof college_email === 'string' ? college_email.trim() : '';
        internSet.college_email = ce ? ce.toLowerCase() : null;
      }
      if (degree)          internSet.degree        = degree.trim();
      if (branch)          internSet.branch        = branch.trim();
      if (specialization !== undefined) {
        internSet.specialization =
          typeof specialization === 'string' && specialization.trim() ? specialization.trim() : null;
      }
      if (graduation_year !== undefined) {
        internSet.graduation_year =
          graduation_year === null || graduation_year === ''
            ? null
            : typeof graduation_year === 'number'
              ? graduation_year
              : parseInt(String(graduation_year), 10);
      }
      if (department_id)   { internSet.department_id = department_id;         userSet.department_id = department_id; }
      if (start_date)      internSet.start_date    = start_date;
      if (end_date !== undefined) internSet.end_date = end_date;
      if (status)          internSet.status        = status;

    } else if (role === 'department_person') {
      // Must be in same department
      if (intern.department_id !== departmentId) {
        logPermissionDenial(userId, role, 'update_intern_other_dept');
        return NextResponse.json({ message: 'Cannot update interns in other departments' }, { status: 403 });
      }
      // Can update all fields except email (to avoid auth issues)
      if (name)            { internSet.name = name.trim();                    userSet.name = name.trim(); }
      if (phone !== undefined) { internSet.phone = phone;                     userSet.phone = phone; }
      if (alternate_phone !== undefined) {
        internSet.alternate_phone = typeof alternate_phone === 'string' && alternate_phone.trim()
          ? alternate_phone.trim()
          : null;
      }
      if (college)         internSet.college       = college.trim();
      if (university !== undefined) {
        internSet.university = typeof university === 'string' && university.trim() ? university.trim() : null;
      }
      if (college_email !== undefined) {
        const ce = typeof college_email === 'string' ? college_email.trim() : '';
        internSet.college_email = ce ? ce.toLowerCase() : null;
      }
      if (degree)          internSet.degree        = degree.trim();
      if (branch)          internSet.branch        = branch.trim();
      if (specialization !== undefined) {
        internSet.specialization =
          typeof specialization === 'string' && specialization.trim() ? specialization.trim() : null;
      }
      if (graduation_year !== undefined) {
        internSet.graduation_year =
          graduation_year === null || graduation_year === ''
            ? null
            : typeof graduation_year === 'number'
              ? graduation_year
              : parseInt(String(graduation_year), 10);
      }
      if (department_id)   { internSet.department_id = department_id;         userSet.department_id = department_id; }
      if (start_date)      internSet.start_date    = start_date;
      if (end_date !== undefined) internSet.end_date = end_date;
      if (status)          internSet.status        = status;

    } else if (role === 'intern') {
      // Can only update their own record
      if (intern.user_id !== userId) {
        logPermissionDenial(userId, role, 'update_other_intern');
        return NextResponse.json({ message: 'Cannot update another intern\'s record' }, { status: 403 });
      }
      // Only allowed fields
      const allowed: Record<string, unknown> = { phone, ...extraFields };
      for (const [key, val] of Object.entries(allowed)) {
        if (INTERN_ALLOWED_FIELDS.has(key) && val !== undefined) {
          internSet[key] = val;
          if (key === 'phone') userSet.phone = val;
        }
      }
      if (Object.keys(internSet).length === 0) {
        return NextResponse.json({ message: 'No updatable fields provided' }, { status: 400 });
      }

    } else {
      return NextResponse.json({ message: 'Permission denied' }, { status: 403 });
    }

    // ── Update intern record ─────────────────────────────────────────────────
    await hasura(
      `mutation UpdateIntern($id: uuid!, $set: interns_set_input!) {
        update_interns_by_pk(pk_columns: { id: $id }, _set: $set) { id name }
      }`,
      { id, set: internSet },
    );

    // ── Update linked user record if needed ──────────────────────────────────
    if (intern.user_id && Object.keys(userSet).length > 0) {
      await hasura(
        `mutation UpdateUser($id: uuid!, $set: users_set_input!) {
          update_users_by_pk(pk_columns: { id: $id }, _set: $set) { id }
        }`,
        { id: intern.user_id, set: userSet },
      );
    }

    return NextResponse.json({ message: 'Intern updated successfully' });
  } catch (err) {
    console.error('[api/interns/update]', err);
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}