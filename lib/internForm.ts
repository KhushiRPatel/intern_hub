/**
 * Single source for intern add/edit form shape and API/demo payload mapping.
 */
import type { InternData, InternStatus } from '@/lib/constants';

export interface InternFormValues {
  name: string;
  email: string;
  phone: string;
  alternate_phone: string;
  college: string;
  university: string;
  college_email: string;
  degree: string;
  branch: string;
  specialization: string;
  graduation_year: string;
  department_id: string;
  start_date: string;
  end_date: string;
  status: InternStatus;
}

export const EMPTY_INTERN_FORM: InternFormValues = {
  name: '',
  email: '',
  phone: '',
  alternate_phone: '',
  college: '',
  university: '',
  college_email: '',
  degree: '',
  branch: '',
  specialization: '',
  graduation_year: '',
  department_id: '',
  start_date: '',
  end_date: '',
  status: 'active',
};

export function normalizeGraduationYear(values: InternFormValues): number | null {
  const t = values.graduation_year.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

/** department_person submissions are forced to their own department */
export function resolveInternFormDepartmentId(
  values: InternFormValues,
  opts: { isDeptPerson: boolean; userDepartmentId?: string | null },
): string {
  if (opts.isDeptPerson && opts.userDepartmentId) return opts.userDepartmentId;
  return values.department_id;
}

/** demoStore.create / update partial shape */
export function internFormValuesToDemoPayload(
  values: InternFormValues,
  department_id: string,
): Omit<InternData, 'id' | 'created_at'> {
  const gy = normalizeGraduationYear(values);
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone || undefined,
    alternate_phone: values.alternate_phone.trim() || undefined,
    college: values.college.trim(),
    university: values.university.trim() || undefined,
    college_email: values.college_email.trim().toLowerCase() || undefined,
    degree: values.degree.trim(),
    branch: values.branch.trim(),
    specialization: values.specialization.trim() || undefined,
    graduation_year: gy ?? undefined,
    department_id,
    start_date: values.start_date,
    end_date: values.end_date || undefined,
    status: values.status,
  };
}

/** POST /api/interns/create JSON body */
export function internFormValuesToCreateApiBody(
  values: InternFormValues,
  department_id: string,
) {
  const gy = normalizeGraduationYear(values);
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone ?? null,
    alternate_phone: values.alternate_phone.trim() || null,
    college: values.college.trim(),
    university: values.university.trim() || null,
    college_email: values.college_email.trim().toLowerCase() || null,
    degree: values.degree.trim(),
    branch: values.branch.trim(),
    specialization: values.specialization.trim() || null,
    graduation_year: gy,
    department_id,
    start_date: values.start_date,
    end_date: values.end_date ?? null,
    status: values.status,
  };
}

/** Hasura update_interns_by_pk _set (admin / department_person full edit) */
export function internFormValuesToHasuraUpdateSet(
  values: InternFormValues,
  department_id: string,
) {
  const gy = normalizeGraduationYear(values);
  const trimmed = internFormValuesToDemoPayload(values, department_id);
  return {
    name: trimmed.name,
    email: trimmed.email,
    phone: trimmed.phone ?? null,
    alternate_phone: trimmed.alternate_phone ?? null,
    college: trimmed.college,
    university: trimmed.university ?? null,
    college_email: trimmed.college_email ?? null,
    degree: trimmed.degree,
    branch: trimmed.branch,
    specialization: trimmed.specialization ?? null,
    graduation_year: gy,
    department_id: trimmed.department_id,
    start_date: trimmed.start_date,
    end_date: trimmed.end_date ?? null,
    status: trimmed.status,
  };
}
