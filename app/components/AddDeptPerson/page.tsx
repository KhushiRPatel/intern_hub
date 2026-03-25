'use client';
import { useState, FormEvent, useEffect } from 'react';
import { DepartmentData } from '@/lib/constants';

export interface DeptPersonFormValues {
  name: string;
  email: string;
  phone: string;
  department_id: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: DeptPersonFormValues) => Promise<void>;
  initialData?: { id: string; name: string; email: string; phone?: string; department_id: string } | null;
  departments: DepartmentData[];
  submitting: boolean;
}

const empty: DeptPersonFormValues = {
  name: '', email: '', phone: '', department_id: '',
};

export default function DeptPersonFormModal({
  isOpen, onClose, onSubmit, initialData, departments, submitting,
}: Props) {
  const [form, setForm] = useState<DeptPersonFormValues>(empty);
  const [errors, setErrors] = useState<Partial<DeptPersonFormValues>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof DeptPersonFormValues, boolean>>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone ?? '',
        department_id: initialData.department_id,
      });
    } else {
      setForm(empty);
    }
    setErrors({});
    setTouched({});
  }, [initialData, isOpen]);

  const set = (field: keyof DeptPersonFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
      validateField(field, e.target.value);
    };

  const handleBlur = (field: keyof DeptPersonFormValues) => {
    setTouched((p) => ({ ...p, [field]: true }));
    validateField(field, form[field]);
  };

  const validateField = (field: keyof DeptPersonFormValues, value: string) => {
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
          newErrors.phone = 'Invalid phone format';
        } else {
          delete newErrors.phone;
        }
        break;

      case 'department_id':
        if (!value) {
          newErrors.department_id = 'Department is required';
        } else {
          delete newErrors.department_id;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const validate = (): boolean => {
    const e: Partial<DeptPersonFormValues> = {};

    if (!form.name.trim()) e.name = 'Name is required';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    else if (form.name.trim().length > 100) e.name = 'Name must be less than 100 characters';

    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    else if (form.email.length > 100) e.email = 'Email must be less than 100 characters';

    if (form.phone && !/^[\d+\-() ]{7,20}$/.test(form.phone)) {
      e.phone = 'Invalid phone format';
    }

    if (!form.department_id) e.department_id = 'Department is required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  if (!isOpen) return null;

  const showError = (field: keyof DeptPersonFormValues) => touched[field] && errors[field];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-800">
            {initialData ? 'Edit Department Person' : 'Add Department Person'}
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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *" error={showError('name') ? errors.name : ''}>
              <input 
                type="text" 
                value={form.name} 
                onChange={set('name')}
                onBlur={() => handleBlur('name')}
                placeholder="John Doe"
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
                placeholder="john@example.com"
                maxLength={100}
                className={input(!!showError('email'))} 
              />
              <p className="text-xs text-slate-500 mt-1">{form.email.length}/100</p>
            </Field>
          </div>

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
              <p className="text-xs text-slate-500 mt-1">Optional</p>
            </Field>
            <Field label="Department *" error={showError('department_id') ? errors.department_id : ''}>
              <select 
                value={form.department_id} 
                onChange={set('department_id')}
                onBlur={() => handleBlur('department_id')}
                className={input(!!showError('department_id'))}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
          </div>

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
                initialData ? 'Save Changes' : 'Add Person'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
