'use client';
import { useState, FormEvent, useEffect } from 'react';
import { INTERN_STATUSES, InternData, DepartmentData } from '@/lib/constants';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';

export interface InternFormValues {
  name: string;
  email: string;
  phone: string;
  college: string;
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
  isInline?: boolean;
}

const EMPTY: InternFormValues = {
  name: '', email: '', phone: '', college: '',
  department_id: '', start_date: '', end_date: '', status: 'active',
};

export default function InternFormModal({
  isOpen, onClose, onSubmit, initialData, departments, submitting, isInline = false,
}: Props) {
  const [form, setForm] = useState<InternFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<InternFormValues>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        name:          initialData.name,
        email:         initialData.email,
        phone:         initialData.phone ?? '',
        college:       initialData.college,
        department_id: initialData.department_id,
        start_date:    initialData.start_date,
        end_date:      initialData.end_date ?? '',
        status:        initialData.status,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const set = (field: keyof InternFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const validate = (): boolean => {
    const e: Partial<InternFormValues> = {};
    if (!form.name.trim())          e.name          = 'Name is required';
    if (!form.email.trim())         e.email         = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    if (!form.college.trim())       e.college       = 'College is required';
    if (!form.department_id)        e.department_id = 'Department is required';
    if (!form.start_date)           e.start_date    = 'Start date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  const formBody = (
    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Full Name *"
          type="text"
          value={form.name}
          onChange={set('name')}
          placeholder="Alice Johnson"
          error={errors.name}
        />
        <Input
          label="Email *"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="alice@example.com"
          error={errors.email}
        />
      </div>

      {/* Phone + College */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          placeholder="+91 9876543210"
        />
        <Input
          label="College *"
          type="text"
          value={form.college}
          onChange={set('college')}
          placeholder="IIT Mumbai"
          error={errors.college}
        />
      </div>

      {/* Department + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Department *"
          value={form.department_id}
          onChange={set('department_id')}
          error={errors.department_id}
        >
          <option value="">Select department</option>
          {(departments ?? []).map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <Select
          label="Status"
          value={form.status}
          onChange={set('status')}
        >
          {INTERN_STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </Select>
      </div>

      {/* Start + End date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Start Date *"
          type="date"
          value={form.start_date}
          onChange={set('start_date')}
          error={errors.start_date}
        />
        <Input
          label="End Date"
          type="date"
          value={form.end_date}
          onChange={set('end_date')}
          min={form.start_date}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={submitting}
          className="flex-1"
        >
          {submitting ? 'Saving…' : initialData ? 'Save Changes' : 'Add Intern'}
        </Button>
      </div>
    </form>
  );

  if (isInline) return isOpen ? formBody : null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Intern' : 'Add New Intern'}
      size="md"
    >
      {formBody}
    </Modal>
  );
}
