'use client';
import { useState, FormEvent, useEffect, type ReactNode } from 'react';
import { INTERN_STATUSES, InternData, DepartmentData } from '@/lib/constants';
import {
  EMPTY_INTERN_FORM,
  type InternFormValues,
} from '@/lib/internForm';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';

export type { InternFormValues };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: InternFormValues) => Promise<void>;
  initialData?: InternData | null;
  departments: DepartmentData[];
  submitting: boolean;
  isInline?: boolean;
  userRole?: string;
  userDepartmentId?: string;
}

function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border border-slate-200/90 dark:border-slate-700/80
        bg-slate-50/50 dark:bg-slate-950/35 p-5 sm:p-6 space-y-5"
    >
      <div className="flex gap-4 pb-4 border-b border-slate-200/70 dark:border-slate-700/70">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
          bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400"
        >
          {icon}
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function InternFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  departments,
  submitting,
  isInline = false,
  userRole,
  userDepartmentId,
}: Props) {
  const [form, setForm] = useState<InternFormValues>(EMPTY_INTERN_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof InternFormValues, string>>>({});
  const isDeptPerson = userRole === 'department_person';
  const deptDepartmentId = isDeptPerson ? userDepartmentId : undefined;

  useEffect(() => {
    if (initialData) {
      setForm({
        // Personal
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone ?? '',
        alternate_phone: initialData.alternate_phone ?? '',
        date_of_birth: initialData.date_of_birth ?? '',
        gender: initialData.gender ?? '',
        blood_group: initialData.blood_group ?? '',
        nationality: initialData.nationality ?? 'Indian',

        // Address
        address_line1: initialData.address_line1 ?? '',
        address_line2: initialData.address_line2 ?? '',
        city: initialData.city ?? '',
        state: initialData.state ?? '',
        pincode: initialData.pincode ?? '',
        country: initialData.country ?? 'India',

        // Academic
        college: initialData.college,
        university: initialData.university ?? '',
        college_email: initialData.college_email ?? '',
        college_city: initialData.college_city ?? '',
        college_state: initialData.college_state ?? '',
        degree: initialData.degree ?? '',
        branch: initialData.branch ?? '',
        specialization: initialData.specialization ?? '',
        graduation_year:
          initialData.graduation_year != null && initialData.graduation_year !== undefined
            ? String(initialData.graduation_year)
            : '',
        current_year:
          initialData.current_year != null && initialData.current_year !== undefined
            ? String(initialData.current_year)
            : '',
        cgpa: initialData.cgpa != null ? String(initialData.cgpa) : '',
        percentage: initialData.percentage != null ? String(initialData.percentage) : '',
        student_id: initialData.student_id ?? '',

        // Internship
        department_id: initialData.department_id,
        start_date: initialData.start_date,
        end_date: initialData.end_date ?? '',
        status: initialData.status,
        duration_months: initialData.duration_months != null ? String(initialData.duration_months) : '',
        work_mode: initialData.work_mode ?? 'onsite',
        stipend: initialData.stipend != null ? String(initialData.stipend) : '',
        offer_letter_date: initialData.offer_letter_date ?? '',
        joining_letter_date: initialData.joining_letter_date ?? '',

        // Skills
        skills: initialData.skills?.join(', ') ?? '',
        languages_known: initialData.languages_known?.join(', ') ?? '',
        tools: initialData.tools?.join(', ') ?? '',

        // Social
        linkedin_url: initialData.linkedin_url ?? '',
        github_url: initialData.github_url ?? '',
        portfolio_url: initialData.portfolio_url ?? '',

        // Identity
        aadhar_number: initialData.aadhar_number ?? '',
        pan_number: initialData.pan_number ?? '',

        // Reference
        reference_name: initialData.reference_name ?? '',
        reference_contact: initialData.reference_contact ?? '',

        // Notes
        notes: initialData.notes ?? '',
      });
    } else {
      // New form: set department for department_person users
      setForm(isDeptPerson && deptDepartmentId  
        ? { ...EMPTY_INTERN_FORM, department_id: deptDepartmentId }
        : EMPTY_INTERN_FORM
      );
    }
    setErrors({});
  }, [initialData, isOpen, isDeptPerson, deptDepartmentId]);

  const set = (field: keyof InternFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  /** Allow only digits, spaces, +, -, ( ) for phone fields */
  const setPhone = (field: 'phone' | 'alternate_phone' | 'reference_contact') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = e.target.value.replace(/[^\d\s\+\-\(\)]/g, '');
      setForm((p) => ({ ...p, [field]: cleaned }));
    };

  const validate = (): boolean => {
    const e: Partial<Record<keyof InternFormValues, string>> = {};

    // ── Personal ──────────────────────────────────────────────
    if (!form.name.trim()) {
      e.name = 'Full name is required';
    } else if (form.name.trim().length < 2) {
      e.name = 'Name must be at least 2 characters';
    }

    if (!form.email.trim()) {
      e.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address';
    }

    if (form.phone.trim()) {
      const digits = form.phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        e.phone = 'Phone must be exactly 10 digits';
      }
    } else {
      e.phone = 'Phone is required';
    }

    if (form.alternate_phone.trim()) {
      const digits = form.alternate_phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        e.alternate_phone = 'Alternate phone must be exactly 10 digits';
      }
    }

    if (form.date_of_birth.trim()) {
      const dob = new Date(form.date_of_birth);
      const now = new Date();
      if (dob > now) {
        e.date_of_birth = 'Date of birth cannot be in the future';
      }
    }

    // ── Address ───────────────────────────────────────────────
    if (form.pincode.trim() && !/^\d{5,6}$/.test(form.pincode.trim())) {
      e.pincode = 'Pincode must be 5-6 digits';
    }

    // ── Academic ──────────────────────────────────────────────
    if (!form.college.trim()) {
      e.college = 'College / Institute is required';
    }
    if (!form.degree.trim()) {
      e.degree = 'Degree is required (e.g. B.Tech, MCA)';
    }
    if (!form.branch.trim()) {
      e.branch = 'Branch is required (e.g. Computer Science)';
    }
    if (form.graduation_year.trim()) {
      const y = Number(form.graduation_year);
      if (!Number.isInteger(y) || y < 1990 || y > 2040) {
        e.graduation_year = 'Enter a valid year between 1990 and 2040';
      }
    }
    if (form.current_year.trim()) {
      const y = Number(form.current_year);
      if (!Number.isInteger(y) || y < 1 || y > 4) {
        e.current_year = 'Enter a year between 1 and 4';
      }
    }
    if (form.cgpa.trim()) {
      const cgpa = Number(form.cgpa);
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        e.cgpa = 'CGPA must be between 0 and 10';
      }
    }
    if (form.percentage.trim()) {
      const perc = Number(form.percentage);
      if (isNaN(perc) || perc < 0 || perc > 100) {
        e.percentage = 'Percentage must be between 0 and 100';
      }
    }
    if (form.college_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.college_email.trim())) {
      e.college_email = 'Enter a valid college email address';
    }

    // ── Internship ─────────────────────────────────────────────
    if (!form.department_id) {
      e.department_id = 'Department is required';
    }
    if (!form.start_date) {
      e.start_date = 'Start date is required';
    }
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      e.end_date = 'End date cannot be before start date';
    }
    if (form.stipend.trim()) {
      const stipend = Number(form.stipend);
      if (isNaN(stipend) || stipend < 0) {
        e.stipend = 'Stipend must be a positive number';
      }
    }

    // ── URLs ───────────────────────────────────────────────────
    if (form.linkedin_url.trim() && !form.linkedin_url.trim().startsWith('http')) {
      e.linkedin_url = 'URL must start with http:// or https://';
    }
    if (form.github_url.trim() && !form.github_url.trim().startsWith('http')) {
      e.github_url = 'URL must start with http:// or https://';
    }
    if (form.portfolio_url.trim() && !form.portfolio_url.trim().startsWith('http')) {
      e.portfolio_url = 'URL must start with http:// or https://';
    }

    // ── Identity ───────────────────────────────────────────────
    if (form.aadhar_number.trim() && !/^\d{12}$/.test(form.aadhar_number.trim())) {
      e.aadhar_number = 'Aadhar must be 12 digits';
    }
    if (form.pan_number.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_number.trim())) {
      e.pan_number = 'Invalid PAN format';
    }

    // ── Reference ─────────────────────────────────────────────
    if (form.reference_contact.trim()) {
      const digits = form.reference_contact.replace(/\D/g, '');
      if (digits.length !== 10) {
        e.reference_contact = 'Mobile number must be exactly 10 digits';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  const sectionClass = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 gap-y-5';

  const formInner = (
    <form
      onSubmit={handleSubmit}
      className={[
        'space-y-8',
        isInline ? 'px-6 py-7 sm:px-10 sm:py-9' : 'px-6 py-6 sm:px-8 sm:py-8',
      ].join(' ')}
    >
      <FormSection
        title="Personal information"
        description="Identity and contact details for the intern account and records."
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        }
      >
        <div className={sectionClass}>
          <Input
            label="Full name"
            required
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Priya Sharma"
            error={errors.name}
          />
          <Input
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="name@example.com"
            error={errors.email}
            disabled={!!initialData}
            hint={initialData ? 'Email cannot be changed after the account is created.' : undefined}
          />
          <Input
            label="Phone"
            type="tel"
            required
            value={form.phone}
            onChange={setPhone('phone')}
            placeholder="e.g. 9876543210"
            error={errors.phone}
            hint="10-digit mobile number"
            maxLength={10}
          />
          <Input
            label="Alternate phone"
            type="tel"
            value={form.alternate_phone}
            onChange={setPhone('alternate_phone')}
            placeholder="Optional 10-digit number"
            error={errors.alternate_phone}
            hint="10-digit mobile number"
            maxLength={10}
            wrapperClassName="sm:col-span-2 xl:col-span-1"
          />
          <Input
            label="Date of birth"
            type="date"
            value={form.date_of_birth}
            onChange={set('date_of_birth')}
            error={errors.date_of_birth}
          />
          <Select
            label="Gender"
            value={form.gender}
            onChange={set('gender')}
          >
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </Select>
          <Select
            label="Blood group"
            value={form.blood_group}
            onChange={set('blood_group')}
          >
            <option value="">Not specified</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </Select>
          <Input
            label="Nationality"
            type="text"
            value={form.nationality}
            onChange={set('nationality')}
            placeholder="Indian"
            wrapperClassName="sm:col-span-2 xl:col-span-1"
          />
        </div>
      </FormSection>

      <FormSection
        title="Address"
        description="Current residential address"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
      >
        <div className={sectionClass}>
          <Input
            label="Address line 1"
            type="text"
            value={form.address_line1}
            onChange={set('address_line1')}
            placeholder="Street address"
            wrapperClassName="sm:col-span-2 xl:col-span-2"
          />
          <Input
            label="Address line 2"
            type="text"
            value={form.address_line2}
            onChange={set('address_line2')}
            placeholder="Apt, suite, etc."
            wrapperClassName="sm:col-span-2 xl:col-span-2"
          />
          <Input
            label="City"
            type="text"
            value={form.city}
            onChange={set('city')}
            placeholder="e.g. Delhi"
          />
          <Input
            label="State"
            type="text"
            value={form.state}
            onChange={set('state')}
            placeholder="e.g. Delhi"
          />
          <Input
            label="Pincode"
            type="text"
            value={form.pincode}
            onChange={set('pincode')}
            placeholder="6 digits"
            error={errors.pincode}
          />
          <Input
            label="Country"
            type="text"
            value={form.country}
            onChange={set('country')}
            placeholder="India"
          />
        </div>
      </FormSection>

      <FormSection
        title="Academic background"
        description="Institution, programme, and field of study"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
            />
          </svg>
        }
      >
        <div className={sectionClass}>
          <Input
            label="College / Institute"
            required
            type="text"
            value={form.college}
            onChange={set('college')}
            placeholder="e.g. IIT Delhi"
            error={errors.college}
            wrapperClassName="xl:col-span-2"
          />
          <Input
            label="University"
            type="text"
            value={form.university}
            onChange={set('university')}
            placeholder="Affiliating university (optional)"
          />
          <Input
            label="College city"
            type="text"
            value={form.college_city}
            onChange={set('college_city')}
            placeholder="College location"
          />
          <Input
            label="College state"
            type="text"
            value={form.college_state}
            onChange={set('college_state')}
            placeholder="College state"
          />
          <Input
            label="Degree"
            required
            type="text"
            value={form.degree}
            onChange={set('degree')}
            placeholder="B.Tech, B.E., MCA, MBA…"
            error={errors.degree}
          />
          <Input
            label="Branch / major"
            required
            type="text"
            value={form.branch}
            onChange={set('branch')}
            placeholder="Computer Science, IT, ECE…"
            error={errors.branch}
          />
          <Input
            label="Specialization"
            type="text"
            value={form.specialization}
            onChange={set('specialization')}
            placeholder="e.g. Machine learning (optional)"
          />
          <Input
            label="Student ID"
            type="text"
            value={form.student_id}
            onChange={set('student_id')}
            placeholder="College student ID"
          />
          <Input
            label="Current year"
            type="number"
            min={1}
            max={4}
            value={form.current_year}
            onChange={set('current_year')}
            placeholder="1-4"
            error={errors.current_year}
          />
          <Input
            label="CGPA"
            type="number"
            min={0}
            max={10}
            step={0.01}
            value={form.cgpa}
            onChange={set('cgpa')}
            placeholder="0.00-10.00"
            error={errors.cgpa}
          />
          <Input
            label="Percentage"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={form.percentage}
            onChange={set('percentage')}
            placeholder="0-100"
            error={errors.percentage}
          />
          <Input
            label="Graduation year"
            type="number"
            min={1990}
            max={2040}
            value={form.graduation_year}
            onChange={set('graduation_year')}
            placeholder="e.g. 2026"
            error={errors.graduation_year}
          />
          <Input
            label="College email"
            type="email"
            value={form.college_email}
            onChange={set('college_email')}
            placeholder="student@university.edu (optional)"
            error={errors.college_email}
            wrapperClassName="sm:col-span-2 xl:col-span-2"
          />
        </div>
      </FormSection>

      <FormSection
        title="Internship details"
        description="Placement, duration, and compensation"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 gap-y-5">
          <Select
            label="Department"
            required
            value={form.department_id}
            onChange={set('department_id')}
            disabled={isDeptPerson}
            error={errors.department_id}
            wrapperClassName="xl:col-span-2"
            title={isDeptPerson ? 'Your department is locked for department_person users' : undefined}
          >
            <option value="">Select department</option>
            {(departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select label="Status" required value={form.status} onChange={set('status')}>
            {INTERN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
          <Input
            label="Start date"
            required
            type="date"
            value={form.start_date}
            onChange={set('start_date')}
            error={errors.start_date}
          />
          <Input
            label="End date"
            type="date"
            value={form.end_date}
            onChange={set('end_date')}
            min={form.start_date}
            hint="Optional — expected completion"
            error={errors.end_date}
          />
          <Input
            label="Duration (months)"
            type="number"
            min={0}
            value={form.duration_months}
            onChange={set('duration_months')}
            placeholder="e.g. 6"
          />
          <Select
            label="Work mode"
            value={form.work_mode}
            onChange={set('work_mode')}
          >
            <option value="onsite">Onsite</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </Select>
          <Input
            label="Monthly stipend"
            type="number"
            min={0}
            step={100}
            value={form.stipend}
            onChange={set('stipend')}
            placeholder="₹0"
            error={errors.stipend}
          />
          <Input
            label="Offer letter date"
            type="date"
            value={form.offer_letter_date}
            onChange={set('offer_letter_date')}
          />
          <Input
            label="Joining letter date"
            type="date"
            value={form.joining_letter_date}
            onChange={set('joining_letter_date')}
          />
        </div>
      </FormSection>

      <FormSection
        title="Skills & expertise"
        description="Programming languages, tools, and proficiencies"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      >
        <div className={sectionClass}>
          <Input
            label="Technical skills"
            type="text"
            value={form.skills}
            onChange={set('skills')}
            placeholder="Python, JavaScript, React… (comma-separated)"
            wrapperClassName="sm:col-span-2 xl:col-span-2"
            hint="Comma-separated list"
          />
          <Input
            label="Languages known"
            type="text"
            value={form.languages_known}
            onChange={set('languages_known')}
            placeholder="English, Hindi, Spanish… (comma-separated)"
            wrapperClassName="sm:col-span-2 xl:col-span-2"
            hint="Comma-separated list"
          />
          <Input
            label="Tools & software"
            type="text"
            value={form.tools}
            onChange={set('tools')}
            placeholder="Git, Docker, AWS… (comma-separated)"
            wrapperClassName="sm:col-span-2 xl:col-span-3"
            hint="Comma-separated list"
          />
        </div>
      </FormSection>

      <FormSection
        title="Professional profiles"
        description="Online portfolios and social links"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4.242 4.242a4 4 0 105.656 5.656l4.242-4.242a4 4 0 00-5.656-5.656l4.242 4.242"
            />
          </svg>
        }
      >
        <div className={sectionClass}>
          <Input
            label="LinkedIn URL"
            type="url"
            value={form.linkedin_url}
            onChange={set('linkedin_url')}
            placeholder="https://linkedin.com/in/…"
            error={errors.linkedin_url}
            wrapperClassName="sm:col-span-2 xl:col-span-2"
          />
          <Input
            label="GitHub URL"
            type="url"
            value={form.github_url}
            onChange={set('github_url')}
            placeholder="https://github.com/…"
            error={errors.github_url}
            wrapperClassName="sm:col-span-2 xl:col-span-2"
          />
          <Input
            label="Portfolio URL"
            type="url"
            value={form.portfolio_url}
            onChange={set('portfolio_url')}
            placeholder="https://yourportfolio.com"
            error={errors.portfolio_url}
            wrapperClassName="sm:col-span-2 xl:col-span-2"
          />
        </div>
      </FormSection>

      <FormSection
        title="Identity documents"
        description="Government/legal identity information"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H5a2 2 0 00-2 2v10a2 2 0 002 2h5m4 0h5a2 2 0 002-2V8a2 2 0 00-2-2h-5m0 0V5a2 2 0 00-2-2h0a2 2 0 00-2 2v1m4 0a2 2 0 10-4 0m0 0V8m0 0a2 2 0 002 2h4a2 2 0 002-2m-6 0a2 2 0 01-2-2m6 0a2 2 0 00-2-2"
            />
          </svg>
        }
      >
        <div className={sectionClass}>
          <Input
            label="Aadhar number"
            type="text"
            value={form.aadhar_number}
            onChange={set('aadhar_number')}
            placeholder="12 digits"
            error={errors.aadhar_number}
          />
          <Input
            label="PAN number"
            type="text"
            value={form.pan_number}
            onChange={set('pan_number')}
            placeholder="ABCDE1234F"
            error={errors.pan_number}
          />
        </div>
      </FormSection>

      <FormSection
        title="Emergency contact"
        description="Reference person for emergencies"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        }
      >
        <div className={sectionClass}>
          <Input
            label="Reference name"
            type="text"
            value={form.reference_name}
            onChange={set('reference_name')}
            placeholder="Full name"
            wrapperClassName="sm:col-span-2 xl:col-span-1"
          />
          <Input
            label="Reference contact"
            type="tel"
            value={form.reference_contact}
            onChange={setPhone('reference_contact')}
            placeholder="Mobile number (10 digits)"
            error={errors.reference_contact}
            wrapperClassName="sm:col-span-2 xl:col-span-2"
            hint="10-digit mobile number"
            maxLength={10}
          />
        </div>
      </FormSection>

      <FormSection
        title="Additional notes"
        description="Any other relevant information"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
      >
        <div className="space-y-5">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Any additional notes or remarks..."
            className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 dark:text-slate-200 dark:bg-slate-800"
            rows={4}
          />
        </div>
      </FormSection>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 mt-1 border-t border-slate-200 dark:border-slate-700/80">
        <Button type="button" variant="outline" onClick={onClose} className="sm:flex-initial sm:min-w-[8rem]">
          Cancel
        </Button>
        <Button type="submit" loading={submitting} className="sm:ml-auto sm:min-w-[11rem]">
          {submitting ? 'Saving…' : initialData ? 'Save changes' : 'Add intern'}
        </Button>
      </div>
    </form>
  );

  if (isInline) {
    if (!isOpen) return null;
    return (
      <div
        className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#1a1829]
          shadow-sm shadow-slate-200/40 dark:shadow-none overflow-hidden"
      >
        {formInner}
      </div>
    );
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit intern' : 'Add new intern'}
      size="2xl"
    >
      {formInner}
    </Modal>
  );
}

