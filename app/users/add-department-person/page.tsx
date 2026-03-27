'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/app/context/AuthContext';
import { DEMO_DEPARTMENTS, DepartmentData } from '@/lib/constants';
import { GET_DEPARTMENTS } from '@/graphql/queries';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

type FormValues = { name: string; email: string; department_id: string };

async function resJsonSafe<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try { return JSON.parse(text) as T; }
  catch { throw new Error(`Server returned non-JSON: ${text.slice(0, 140)}`); }
}

export default function AddDepartmentPersonPage() {
  const { user, token, isLoading } = useAuth(); // ← token added
  const router = useRouter();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'admin') router.replace('/dashboard');
  }, [isLoading, user, router]);

  // ── Departments via GraphQL ────────────────────────────────────────────────
  const { data: deptData, loading: deptsLoading, error: deptGqlError } = useQuery<{
    departments: DepartmentData[];
  }>(GET_DEPARTMENTS, { skip: IS_DEMO });

  const departments: DepartmentData[] = IS_DEMO
    ? DEMO_DEPARTMENTS
    : (deptData?.departments ?? []);
  const deptsError  = deptGqlError?.message ?? null;
  const showNoDepts = !IS_DEMO && !deptsLoading && !deptsError && departments.length === 0;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm]             = useState<FormValues>({ name: '', email: '', department_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState<{ email: string; tempPassword?: string; resetLink?: string } | null>(null);

  const set = (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  const validate = () => {
    if (!form.name.trim())    return 'Name is required';
    if (!form.email.trim())   return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email';
    if (!form.department_id)  return 'Department is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const vErr = validate();
    if (vErr) { setError(vErr); return; }

    setSubmitting(true);
    try {
      if (IS_DEMO) {
        // Demo mode: no persistence, just show placeholder credentials
        setSuccess({ email: form.email.trim().toLowerCase(), tempPassword: 'DEMO_TEMP_PASSWORD' });
        return;
      }

      // ✅ FIX: Authorization header so the API auth guard passes
      const res = await fetch('/api/users/create-department-person', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name:          form.name.trim(),
          email:         form.email.trim().toLowerCase(),
          department_id: form.department_id,
        }),
      });

      const data = await resJsonSafe<{
        message?: string;
        credentials?: { email: string; tempPassword: string };
        resetLink?: string;
        emailSent?: boolean;
        emailNote?: string;
      }>(res);

      if (!res.ok) throw new Error(data.message || 'Failed to create department person');

      setSuccess({
        email:        form.email.trim().toLowerCase(),
        tempPassword: data.credentials?.tempPassword,
        resetLink:    data.resetLink,
      });
      setForm({ name: '', email: '', department_id: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create department person');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading || (!IS_DEMO && deptsLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Add Department Person</h2>
        <p className="text-sm text-slate-500 mt-1">
          An account will be created and a password-setup email will be sent automatically.
        </p>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      {deptsError && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          {deptsError}
        </div>
      )}
      {showNoDepts && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          No departments found. Seed the <code>departments</code> table first.
        </div>
      )}

      {/* ── Success card ── */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-900 px-4 py-4 rounded-xl text-sm space-y-1">
          <p className="font-semibold text-green-800">✓ Department person created</p>
          <p>Email: <span className="font-mono">{success.email}</span></p>
          {success.tempPassword && (
            <p>Temp password: <span className="font-mono">{success.tempPassword}</span></p>
          )}
          {success.resetLink && (
            <div className="mt-2">
              <p className="text-xs text-green-700 mb-1">Password setup link (share if email not configured):</p>
              <p className="font-mono text-xs break-all bg-green-100 px-2 py-1 rounded">
                {success.resetLink}
              </p>
            </div>
          )}
          <button
            onClick={() => setSuccess(null)}
            className="mt-2 text-xs text-green-700 underline hover:text-green-900"
          >
            Add another
          </button>
        </div>
      )}

      {/* ── Form ── */}
      {!success && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-6 py-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Sarah Sharma"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 dark:text-slate-200 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="sarah@example.com"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 dark:text-slate-200 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Department *
            </label>
            <select
              value={form.department_id}
              onChange={set('department_id')}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 dark:text-slate-200 dark:bg-slate-800"
            >
              <option value="">Select department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || showNoDepts}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating…
                </>
              ) : 'Create Department Person'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}