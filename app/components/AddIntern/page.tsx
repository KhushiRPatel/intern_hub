'use client';
import { useState, FormEvent, useEffect } from 'react';
import {
  INTERN_STATUSES,
  InternData, DepartmentData,
} from '@/lib/constants';

export interface InternFormValues {
  name: string;
  email: string;
  phone: string;
  college: string;
  degree: string;
  branch: string;
  department_id: string;
  start_date: string;
  end_date: string;
  status: InternData['status'];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: InternFormValues) => Promise<void>;
  initialData?: InternData | null;
  departments: DepartmentData[];
  submitting: boolean;
  /** When true, renders inline (no overlay/backdrop) */
  isInline?: boolean;
}

const empty: InternFormValues = {
  name: '', email: '', phone: '', college: '', degree: '', branch: '',
  department_id: '', start_date: '', end_date: '', status: 'active',
};

export default function InternFormModal({
  isOpen, onClose, onSubmit, initialData, departments, submitting, isInline = false,
}: Props) {
  const [form, setForm] = useState<InternFormValues>(empty);
  const [errors, setErrors] = useState<Partial<InternFormValues>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof InternFormValues, boolean>>>({});

  const depts = departments;

  // Pre-fill when editing
  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone ?? '',
        college: initialData.college,
        degree: initialData.degree,
        branch: initialData.branch,
        department_id: initialData.department_id,
        start_date: initialData.start_date,
        end_date: initialData.end_date ?? '',
        status: initialData.status,
      });
    } else {
      setForm(empty);
    }
    setErrors({});
    setTouched({});
  }, [initialData, isOpen]);

  const set = (field: keyof InternFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      validateField(field, e.target.value);
    };

  const handleBlur = (field: keyof InternFormValues) => {
    setTouched((p) => ({ ...p, [field]: true }));
    validateField(field, form[field]);
  };

  const validateField = (field: keyof InternFormValues, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Name is required';
        } else if (value.trim().length < 2) {
          newErrors.name = 'Name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          newErrors.name = 'Name must be less than 100 characters';
        } else {
          delete newErrors.name;
        }
        break;

      case 'email':
        if (!value.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Invalid email format';
        } else if (value.length > 100) {
          newErrors.email = 'Email must be less than 100 characters';
        } else {
          delete newErrors.email;
        }
        break;

      case 'phone':
        if (value && !/^[\d+\-() ]{7,20}$/.test(value)) {
          newErrors.phone = 'Invalid phone format (7-20 characters, digits, +, -, parentheses, spaces)';
        } else {
          delete newErrors.phone;
        }
        break;

      case 'college':
        if (!value.trim()) {
          newErrors.college = 'College is required';
        } else if (value.trim().length < 2) {
          newErrors.college = 'College name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          newErrors.college = 'College name must be less than 100 characters';
        } else {
          delete newErrors.college;
        }
        break;

      case 'department_id':
        if (!value) {
          newErrors.department_id = 'Department is required';
        } else {
          delete newErrors.department_id;
        }
        break;

      case 'start_date':
        if (!value) {
          newErrors.start_date = 'Start date is required';
        } else if (form.end_date && new Date(value) > new Date(form.end_date)) {
          newErrors.start_date = 'Start date cannot be after end date';
        } else {
          delete newErrors.start_date;
        }
        break;

      case 'end_date':
        if (value && form.start_date && new Date(value) < new Date(form.start_date)) {
          newErrors.end_date = 'End date must be after start date';
        } else if (value && value.length > 0) {
          delete newErrors.end_date;
        } else {
          delete newErrors.end_date;
        }
        break;

      case 'degree':
        if (!value.trim()) {
          newErrors.degree = 'Degree is required';
        } else if (value.trim().length < 2) {
          newErrors.degree = 'Degree must be at least 2 characters';
        } else if (value.trim().length > 100) {
          newErrors.degree = 'Degree must be less than 100 characters';
        } else {
          delete newErrors.degree;
        }
        break;

      case 'branch':
        if (!value.trim()) {
          newErrors.branch = 'Branch is required';
        } else if (value.trim().length < 2) {
          newErrors.branch = 'Branch must be at least 2 characters';
        } else if (value.trim().length > 100) {
          newErrors.branch = 'Branch must be less than 100 characters';
        } else {
          delete newErrors.branch;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const validate = (): boolean => {
    const e: Partial<InternFormValues> = {};

    // Name
    if (!form.name.trim()) e.name = 'Name is required';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    else if (form.name.trim().length > 100) e.name = 'Name must be less than 100 characters';

    // Email
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    else if (form.email.length > 100) e.email = 'Email must be less than 100 characters';

    // Phone
    if (form.phone && !/^[\d+\-() ]{7,20}$/.test(form.phone)) {
      e.phone = 'Invalid phone format';
    }

    // College
    if (!form.college.trim()) e.college = 'College is required';
    else if (form.college.trim().length < 2) e.college = 'College name must be at least 2 characters';
    else if (form.college.trim().length > 100) e.college = 'College name must be less than 100 characters';

    // Degree
    if (!form.degree.trim()) e.degree = 'Degree is required';
    else if (form.degree.trim().length < 2) e.degree = 'Degree must be at least 2 characters';
    else if (form.degree.trim().length > 100) e.degree = 'Degree must be less than 100 characters';

    // Branch
    if (!form.branch.trim()) e.branch = 'Branch is required';
    else if (form.branch.trim().length < 2) e.branch = 'Branch must be at least 2 characters';
    else if (form.branch.trim().length > 100) e.branch = 'Branch must be less than 100 characters';

    // Department
    if (!form.department_id) e.department_id = 'Department is required';

    // Start Date
    if (!form.start_date) e.start_date = 'Start date is required';

    // End Date validation (if provided)
    if (form.end_date) {
      if (new Date(form.end_date) < new Date(form.start_date)) {
        e.end_date = 'End date must be after start date';
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

  if (!isOpen) return null;

  const showError = (field: keyof InternFormValues) => touched[field] && errors[field];

  // The actual form body (shared between modal and inline mode)
  const formBody = (
    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name *" error={showError('name') ? errors.name : ''}>
          <input 
            type="text" 
            value={form.name} 
            onChange={set('name')}
            onBlur={() => handleBlur('name')}
            placeholder="e.g. Alice Johnson"
            maxLength={100}
            className={input(!!showError('name'))} 
          />
          <p className="text-xs text-slate-500 mt-1">{form.name.length}/100</p>
        </Field>
        <Field label="Email *" error={showError('email') ? errors.email : ''}>
          <input 
            type="email" 
            value={form.email} 
            onChange={set('email')}
            onBlur={() => handleBlur('email')}
            placeholder="alice@example.com"
            maxLength={100}
            className={input(!!showError('email'))} 
          />
          <p className="text-xs text-slate-500 mt-1">{form.email.length}/100</p>
        </Field>
      </div>

      {/* Phone + College */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone" error={showError('phone') ? errors.phone : ''}>
          <input 
            type="tel" 
            value={form.phone} 
            onChange={set('phone')}
            onBlur={() => handleBlur('phone')}
            placeholder="+91 9876543210"
            className={input(!!showError('phone'))} 
          />
          <p className="text-xs text-slate-500 mt-1">Optional • Format: +91 1234567890</p>
        </Field>
        <Field label="College *" error={showError('college') ? errors.college : ''}>
          <input 
            type="text" 
            value={form.college} 
            onChange={set('college')}
            onBlur={() => handleBlur('college')}
            placeholder="IIT Mumbai"
            maxLength={100}
            className={input(!!showError('college'))} 
          />
          <p className="text-xs text-slate-500 mt-1">{form.college.length}/100</p>
        </Field>
      </div>

      {/* Degree + Branch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Degree *" error={showError('degree') ? errors.degree : ''}>
          <input 
            type="text" 
            value={form.degree} 
            onChange={set('degree')}
            onBlur={() => handleBlur('degree')}
            placeholder="B.Tech, MCA, MBA, etc."
            maxLength={100}
            className={input(!!showError('degree'))} 
          />
          <p className="text-xs text-slate-500 mt-1">{form.degree.length}/100</p>
        </Field>
        <Field label="Branch *" error={showError('branch') ? errors.branch : ''}>
          <input 
            type="text" 
            value={form.branch} 
            onChange={set('branch')}
            onBlur={() => handleBlur('branch')}
            placeholder="CSE, IT, ECE, Mech, etc."
            maxLength={100}
            className={input(!!showError('branch'))} 
          />
          <p className="text-xs text-slate-500 mt-1">{form.branch.length}/100</p>
        </Field>
      </div>

      {/* Department + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Department *" error={showError('department_id') ? errors.department_id : ''}>
          <select 
            value={form.department_id} 
            onChange={set('department_id')}
            onBlur={() => handleBlur('department_id')}
            className={input(!!showError('department_id'))}
          >
            <option value="">Select department</option>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select 
            value={form.status} 
            onChange={set('status')} 
            className={input(false)}
          >
            {INTERN_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Start + End date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Start Date *" error={showError('start_date') ? errors.start_date : ''}>
          <input 
            type="date" 
            value={form.start_date} 
            onChange={set('start_date')}
            onBlur={() => handleBlur('start_date')}
            className={input(!!showError('start_date'))} 
          />
        </Field>
        <Field label="End Date" error={showError('end_date') ? errors.end_date : ''}>
          <input 
            type="date" 
            value={form.end_date} 
            onChange={set('end_date')}
            onBlur={() => handleBlur('end_date')}
            min={form.start_date} 
            className={input(!!showError('end_date'))} 
          />
          <p className="text-xs text-slate-500 mt-1">Optional • Must be after start date</p>
        </Field>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button 
          type="button" 
          onClick={onClose}
          className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={submitting || Object.keys(errors).length > 0}
          className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
          ) : (
            initialData ? 'Save Changes' : 'Add Intern'
          )}
        </button>
      </div>
    </form>
  );

  // Inline mode — no overlay, just the form
  if (isInline) return formBody;

  // Modal mode — with backdrop + panel
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-800">
            {initialData ? 'Edit Intern' : 'Add New Intern'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {formBody}
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

const input = (hasError: boolean) =>
  `w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${hasError
    ? 'border-red-400 focus:ring-red-300 bg-red-50'
    : 'border-slate-300 focus:ring-blue-400 focus:border-transparent'
  } text-slate-800`;


