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
}: Props) {
  const [form, setForm] = useState<InternFormValues>(EMPTY_INTERN_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof InternFormValues, string>>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone ?? '',
        alternate_phone: initialData.alternate_phone ?? '',
        college: initialData.college,
        university: initialData.university ?? '',
        college_email: initialData.college_email ?? '',
        degree: initialData.degree ?? '',
        branch: initialData.branch ?? '',
        specialization: initialData.specialization ?? '',
        graduation_year:
          initialData.graduation_year != null && initialData.graduation_year !== undefined
            ? String(initialData.graduation_year)
            : '',
        department_id: initialData.department_id,
        start_date: initialData.start_date,
        end_date: initialData.end_date ?? '',
        status: initialData.status,
      });
    } else {
      setForm(EMPTY_INTERN_FORM);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const set = (field: keyof InternFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  /** Allow only digits, spaces, +, -, ( ) for phone fields */
  const setPhone = (field: 'phone' | 'alternate_phone') =>
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
      if (digits.length < 7 || digits.length > 15) {
        e.phone = 'Phone must be 7–15 digits';
      }
    }

    if (form.alternate_phone.trim()) {
      const digits = form.alternate_phone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        e.alternate_phone = 'Alternate phone must be 7–15 digits';
      }
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
    if (form.college_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.college_email.trim())) {
      e.college_email = 'Enter a valid college email address';
    }

    // ── Placement ─────────────────────────────────────────────
    if (!form.department_id) {
      e.department_id = 'Department is required';
    }
    if (!form.start_date) {
      e.start_date = 'Start date is required';
    }
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      e.end_date = 'End date cannot be before start date';
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
            value={form.phone}
            onChange={setPhone('phone')}
            placeholder="+91 98765 43210"
            error={errors.phone}
            hint="Digits only · 7–15 characters"
          />
          <Input
            label="Alternate phone"
            type="tel"
            value={form.alternate_phone}
            onChange={setPhone('alternate_phone')}
            placeholder="Optional second number"
            error={errors.alternate_phone}
            wrapperClassName="sm:col-span-2 xl:col-span-1"
          />
        </div>
      </FormSection>

      <FormSection
        title="Academic background"
        description="Institution, programme, and field of study."
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
        title="Internship placement"
        description="Department, programme dates, and current status."
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
            error={errors.department_id}
            wrapperClassName="xl:col-span-2"
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
