/**
 * Single source for intern add/edit form shape and API/demo payload mapping.
 */
import type { InternData, InternStatus } from '@/lib/constants';

export interface InternFormValues {
  // Personal
  name: string;
  email: string;
  phone: string;
  alternate_phone: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  nationality: string;

  // Address
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;

  // Academic
  college: string;
  university: string;
  college_email: string;
  college_city: string;
  college_state: string;
  degree: string;
  branch: string;
  specialization: string;
  graduation_year: string;
  current_year: string;
  cgpa: string;
  percentage: string;
  student_id: string;

  // Internship
  department_id: string;
  start_date: string;
  end_date: string;
  status: InternStatus;
  duration_months: string;
  work_mode: string;
  stipend: string;
  offer_letter_date: string;
  joining_letter_date: string;

  // Skills
  skills: string;
  languages_known: string;
  tools: string;

  // Social
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;

  // Identity
  aadhar_number: string;
  pan_number: string;

  // Reference
  reference_name: string;
  reference_contact: string;

  // Notes
  notes: string;
}

export const EMPTY_INTERN_FORM: InternFormValues = {
  // Personal
  name: '',
  email: '',
  phone: '',
  alternate_phone: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
  nationality: 'Indian',

  // Address
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',

  // Academic
  college: '',
  university: '',
  college_email: '',
  college_city: '',
  college_state: '',
  degree: '',
  branch: '',
  specialization: '',
  graduation_year: '',
  current_year: '',
  cgpa: '',
  percentage: '',
  student_id: '',

  // Internship
  department_id: '',
  start_date: '',
  end_date: '',
  status: 'active',
  duration_months: '',
  work_mode: 'onsite',
  stipend: '',
  offer_letter_date: '',
  joining_letter_date: '',

  // Skills
  skills: '',
  languages_known: '',
  tools: '',

  // Social
  linkedin_url: '',
  github_url: '',
  portfolio_url: '',

  // Identity
  aadhar_number: '',
  pan_number: '',

  // Reference
  reference_name: '',
  reference_contact: '',

  // Notes
  notes: '',
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
  const cy = values.current_year ? parseInt(values.current_year, 10) : undefined;
  const dm = values.duration_months ? parseInt(values.duration_months, 10) : undefined;
  const cgpa = values.cgpa ? parseFloat(values.cgpa) : undefined;
  const percent = values.percentage ? parseFloat(values.percentage) : undefined;
  const stip = values.stipend ? parseFloat(values.stipend) : undefined;

  return {
    // Personal
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone || undefined,
    alternate_phone: values.alternate_phone.trim() || undefined,
    date_of_birth: values.date_of_birth || undefined,
    gender: values.gender || undefined,
    blood_group: values.blood_group || undefined,
    nationality: values.nationality || 'Indian',
    
    // Address
    address_line1: values.address_line1.trim() || undefined,
    address_line2: values.address_line2.trim() || undefined,
    city: values.city.trim() || undefined,
    state: values.state.trim() || undefined,
    pincode: values.pincode.trim() || undefined,
    country: values.country || 'India',
    
    // Academic
    college: values.college.trim(),
    university: values.university.trim() || undefined,
    college_email: values.college_email.trim().toLowerCase() || undefined,
    college_city: values.college_city.trim() || undefined,
    college_state: values.college_state.trim() || undefined,
    degree: values.degree.trim(),
    branch: values.branch.trim(),
    specialization: values.specialization.trim() || undefined,
    graduation_year: gy ?? undefined,
    current_year: cy ?? undefined,
    cgpa: cgpa ?? undefined,
    percentage: percent ?? undefined,
    student_id: values.student_id.trim() || undefined,
    
    // Internship
    department_id,
    start_date: values.start_date || undefined,
    end_date: values.end_date || undefined,
    status: values.status,
    duration_months: dm ?? undefined,
    work_mode: values.work_mode || 'onsite',
    stipend: stip ?? undefined,
    offer_letter_date: values.offer_letter_date || undefined,
    joining_letter_date: values.joining_letter_date || undefined,
    
    // Skills (store as arrays)
    skills: values.skills.trim() ? values.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    languages_known: values.languages_known.trim() ? values.languages_known.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    tools: values.tools.trim() ? values.tools.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    
    // Social
    linkedin_url: values.linkedin_url.trim() || undefined,
    github_url: values.github_url.trim() || undefined,
    portfolio_url: values.portfolio_url.trim() || undefined,
    
    // Identity
    aadhar_number: values.aadhar_number.trim() || undefined,
    pan_number: values.pan_number.trim() || undefined,
    
    // Reference
    reference_name: values.reference_name.trim() || undefined,
    reference_contact: values.reference_contact.trim() || undefined,
    
    // Notes
    notes: values.notes.trim() || undefined,
  };
}

/** POST /api/interns/create JSON body */
export function internFormValuesToCreateApiBody(
  values: InternFormValues,
  department_id: string,
) {
  const gy = normalizeGraduationYear(values);
  const cy = values.current_year ? parseInt(values.current_year, 10) : null;
  const dm = values.duration_months ? parseInt(values.duration_months, 10) : null;
  const cgpa = values.cgpa ? parseFloat(values.cgpa) : null;
  const percent = values.percentage ? parseFloat(values.percentage) : null;
  const stip = values.stipend ? parseFloat(values.stipend) : null;

  return {
    // Personal
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone ?? null,
    alternate_phone: values.alternate_phone.trim() || null,
    date_of_birth: values.date_of_birth || null,
    gender: values.gender || null,
    blood_group: values.blood_group || null,
    nationality: values.nationality || 'Indian',
    
    // Address
    address_line1: values.address_line1.trim() || null,
    address_line2: values.address_line2.trim() || null,
    city: values.city.trim() || null,
    state: values.state.trim() || null,
    pincode: values.pincode.trim() || null,
    country: values.country || 'India',
    
    // Academic
    college: values.college.trim(),
    university: values.university.trim() || null,
    college_email: values.college_email.trim().toLowerCase() || null,
    college_city: values.college_city.trim() || null,
    college_state: values.college_state.trim() || null,
    degree: values.degree.trim(),
    branch: values.branch.trim(),
    specialization: values.specialization.trim() || null,
    graduation_year: gy,
    current_year: cy,
    cgpa: cgpa,
    percentage: percent,
    student_id: values.student_id.trim() || null,
    
    // Internship
    department_id,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    status: values.status,
    duration_months: dm,
    work_mode: values.work_mode || 'onsite',
    stipend: stip,
    offer_letter_date: values.offer_letter_date || null,
    joining_letter_date: values.joining_letter_date || null,
    
    // Skills (store as arrays)
    skills: values.skills.trim() ? values.skills.split(',').map(s => s.trim()).filter(Boolean) : null,
    languages_known: values.languages_known.trim() ? values.languages_known.split(',').map(s => s.trim()).filter(Boolean) : null,
    tools: values.tools.trim() ? values.tools.split(',').map(s => s.trim()).filter(Boolean) : null,
    
    // Social
    linkedin_url: values.linkedin_url.trim() || null,
    github_url: values.github_url.trim() || null,
    portfolio_url: values.portfolio_url.trim() || null,
    
    // Identity
    aadhar_number: values.aadhar_number.trim() || null,
    pan_number: values.pan_number.trim() || null,
    
    // Reference
    reference_name: values.reference_name.trim() || null,
    reference_contact: values.reference_contact.trim() || null,
    
    // Notes
    notes: values.notes.trim() || null,
  };
}

/** Hasura update_interns_by_pk _set (admin / department_person full edit) */
export function internFormValuesToHasuraUpdateSet(
  values: InternFormValues,
  department_id: string,
) {
  const trimmed = internFormValuesToDemoPayload(values, department_id);
  // NOTE: This function is kept for reference but we now use the REST API /api/interns/update
  // which has full permissions. The REST API handles all fields properly.
  return {
    // Personal
    name: trimmed.name,
    phone: trimmed.phone ?? null,
    
    // Academic
    college: trimmed.college,
    degree: trimmed.degree,
    branch: trimmed.branch,
    
    // Internship
    start_date: trimmed.start_date,
    end_date: trimmed.end_date ?? null,
    status: trimmed.status,
  };
}
