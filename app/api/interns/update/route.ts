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
      // Full update - handle all fields
      if (name)            { internSet.name = name.trim();                    userSet.name = name.trim(); }
      if (email)           { internSet.email = email.trim().toLowerCase();    userSet.email = email.trim().toLowerCase(); }
      if (phone !== undefined) { internSet.phone = phone;                     userSet.phone = phone; }
      if (alternate_phone !== undefined) {
        internSet.alternate_phone = typeof alternate_phone === 'string' && alternate_phone.trim()
          ? alternate_phone.trim()
          : null;
      }
      // Personal details
      if (body.date_of_birth !== undefined) internSet.date_of_birth = body.date_of_birth || null;
      if (body.gender !== undefined) internSet.gender = body.gender || null;
      if (body.blood_group !== undefined) internSet.blood_group = body.blood_group || null;
      if (body.nationality !== undefined) internSet.nationality = body.nationality || null;
      
      // Address
      if (body.address_line1 !== undefined) internSet.address_line1 = body.address_line1?.trim() || null;
      if (body.address_line2 !== undefined) internSet.address_line2 = body.address_line2?.trim() || null;
      if (body.city !== undefined) internSet.city = body.city?.trim() || null;
      if (body.state !== undefined) internSet.state = body.state?.trim() || null;
      if (body.pincode !== undefined) internSet.pincode = body.pincode?.trim() || null;
      if (body.country !== undefined) internSet.country = body.country || null;
      
      // Academic
      if (college)         internSet.college       = college.trim();
      if (university !== undefined) {
        internSet.university = typeof university === 'string' && university.trim() ? university.trim() : null;
      }
      if (college_email !== undefined) {
        const ce = typeof college_email === 'string' ? college_email.trim() : '';
        internSet.college_email = ce ? ce.toLowerCase() : null;
      }
      if (body.college_city !== undefined) internSet.college_city = body.college_city?.trim() || null;
      if (body.college_state !== undefined) internSet.college_state = body.college_state?.trim() || null;
      if (degree)          internSet.degree        = degree.trim();
      if (branch)          internSet.branch        = branch.trim();
      if (specialization !== undefined) {
        internSet.specialization =
          typeof specialization === 'string' && specialization.trim() ? specialization.trim() : null;
      }
      if (body.student_id !== undefined) internSet.student_id = body.student_id?.trim() || null;
      if (body.current_year !== undefined) {
        internSet.current_year = body.current_year === null || body.current_year === ''
          ? null
          : parseInt(String(body.current_year), 10);
      }
      if (body.cgpa !== undefined) {
        internSet.cgpa = body.cgpa === null || body.cgpa === '' ? null : parseFloat(body.cgpa);
      }
      if (body.percentage !== undefined) {
        internSet.percentage = body.percentage === null || body.percentage === '' ? null : parseFloat(body.percentage);
      }
      if (graduation_year !== undefined) {
        internSet.graduation_year =
          graduation_year === null || graduation_year === ''
            ? null
            : typeof graduation_year === 'number'
              ? graduation_year
              : parseInt(String(graduation_year), 10);
      }
      
      // Internship
      if (department_id)   { internSet.department_id = department_id;         userSet.department_id = department_id; }
      if (start_date)      internSet.start_date    = start_date;
      if (end_date !== undefined) internSet.end_date = end_date;
      if (status)          internSet.status        = status;
      if (body.duration_months !== undefined) {
        internSet.duration_months = body.duration_months === null || body.duration_months === ''
          ? null
          : parseInt(String(body.duration_months), 10);
      }
      if (body.work_mode !== undefined) internSet.work_mode = body.work_mode || null;
      if (body.stipend !== undefined) {
        internSet.stipend = body.stipend === null || body.stipend === '' ? null : parseFloat(body.stipend);
      }
      if (body.offer_letter_date !== undefined) internSet.offer_letter_date = body.offer_letter_date || null;
      if (body.joining_letter_date !== undefined) internSet.joining_letter_date = body.joining_letter_date || null;
      
      // Skills
      if (body.skills !== undefined) internSet.skills = body.skills || null;
      if (body.languages_known !== undefined) internSet.languages_known = body.languages_known || null;
      if (body.tools !== undefined) internSet.tools = body.tools || null;
      
      // Social
      if (body.linkedin_url !== undefined) internSet.linkedin_url = body.linkedin_url?.trim() || null;
      if (body.github_url !== undefined) internSet.github_url = body.github_url?.trim() || null;
      if (body.portfolio_url !== undefined) internSet.portfolio_url = body.portfolio_url?.trim() || null;
      
      // Identity
      if (body.aadhar_number !== undefined) internSet.aadhar_number = body.aadhar_number?.trim() || null;
      if (body.pan_number !== undefined) internSet.pan_number = body.pan_number?.trim() || null;
      
      // Reference
      if (body.reference_name !== undefined) internSet.reference_name = body.reference_name?.trim() || null;
      if (body.reference_contact !== undefined) internSet.reference_contact = body.reference_contact?.trim() || null;
      
      // Notes
      if (body.notes !== undefined) internSet.notes = body.notes?.trim() || null;
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
      // Personal details
      if (email !== undefined) { internSet.email = email.trim().toLowerCase(); userSet.email = email.trim().toLowerCase(); }
      if (body.date_of_birth !== undefined) internSet.date_of_birth = body.date_of_birth || null;
      if (body.gender !== undefined) internSet.gender = body.gender || null;
      if (body.blood_group !== undefined) internSet.blood_group = body.blood_group || null;
      if (body.nationality !== undefined) internSet.nationality = body.nationality || null;
      
      // Address
      if (body.address_line1 !== undefined) internSet.address_line1 = body.address_line1?.trim() || null;
      if (body.address_line2 !== undefined) internSet.address_line2 = body.address_line2?.trim() || null;
      if (body.city !== undefined) internSet.city = body.city?.trim() || null;
      if (body.state !== undefined) internSet.state = body.state?.trim() || null;
      if (body.pincode !== undefined) internSet.pincode = body.pincode?.trim() || null;
      if (body.country !== undefined) internSet.country = body.country || null;
      
      // Academic
      if (college)         internSet.college       = college.trim();
      if (university !== undefined) {
        internSet.university = typeof university === 'string' && university.trim() ? university.trim() : null;
      }
      if (college_email !== undefined) {
        const ce = typeof college_email === 'string' ? college_email.trim() : '';
        internSet.college_email = ce ? ce.toLowerCase() : null;
      }
      if (body.college_city !== undefined) internSet.college_city = body.college_city?.trim() || null;
      if (body.college_state !== undefined) internSet.college_state = body.college_state?.trim() || null;
      if (degree)          internSet.degree        = degree.trim();
      if (branch)          internSet.branch        = branch.trim();
      if (specialization !== undefined) {
        internSet.specialization =
          typeof specialization === 'string' && specialization.trim() ? specialization.trim() : null;
      }
      if (body.student_id !== undefined) internSet.student_id = body.student_id?.trim() || null;
      if (body.current_year !== undefined) {
        internSet.current_year = body.current_year === null || body.current_year === ''
          ? null
          : parseInt(String(body.current_year), 10);
      }
      if (body.cgpa !== undefined) {
        internSet.cgpa = body.cgpa === null || body.cgpa === '' ? null : parseFloat(body.cgpa);
      }
      if (body.percentage !== undefined) {
        internSet.percentage = body.percentage === null || body.percentage === '' ? null : parseFloat(body.percentage);
      }
      if (graduation_year !== undefined) {
        internSet.graduation_year =
          graduation_year === null || graduation_year === ''
            ? null
            : typeof graduation_year === 'number'
              ? graduation_year
              : parseInt(String(graduation_year), 10);
      }
      
      // Internship
      if (department_id)   { internSet.department_id = department_id;         userSet.department_id = department_id; }
      if (start_date)      internSet.start_date    = start_date;
      if (end_date !== undefined) internSet.end_date = end_date;
      if (status)          internSet.status        = status;
      if (body.duration_months !== undefined) {
        internSet.duration_months = body.duration_months === null || body.duration_months === ''
          ? null
          : parseInt(String(body.duration_months), 10);
      }
      if (body.work_mode !== undefined) internSet.work_mode = body.work_mode || null;
      if (body.stipend !== undefined) {
        internSet.stipend = body.stipend === null || body.stipend === '' ? null : parseFloat(body.stipend);
      }
      if (body.offer_letter_date !== undefined) internSet.offer_letter_date = body.offer_letter_date || null;
      if (body.joining_letter_date !== undefined) internSet.joining_letter_date = body.joining_letter_date || null;
      
      // Skills
      if (body.skills !== undefined) internSet.skills = body.skills || null;
      if (body.languages_known !== undefined) internSet.languages_known = body.languages_known || null;
      if (body.tools !== undefined) internSet.tools = body.tools || null;
      
      // Social
      if (body.linkedin_url !== undefined) internSet.linkedin_url = body.linkedin_url?.trim() || null;
      if (body.github_url !== undefined) internSet.github_url = body.github_url?.trim() || null;
      if (body.portfolio_url !== undefined) internSet.portfolio_url = body.portfolio_url?.trim() || null;
      
      // Identity
      if (body.aadhar_number !== undefined) internSet.aadhar_number = body.aadhar_number?.trim() || null;
      if (body.pan_number !== undefined) internSet.pan_number = body.pan_number?.trim() || null;
      
      // Reference
      if (body.reference_name !== undefined) internSet.reference_name = body.reference_name?.trim() || null;
      if (body.reference_contact !== undefined) internSet.reference_contact = body.reference_contact?.trim() || null;
      
      // Notes
      if (body.notes !== undefined) internSet.notes = body.notes?.trim() || null;

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