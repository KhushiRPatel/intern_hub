'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { GET_DEPARTMENTS, GET_INTERNS, GET_DASHBOARD_STATS } from '@/graphql/queries';
import { useAuth } from '@/app/context/AuthContext';
import { demoStore } from '@/lib/demoStore';
import { DEMO_DEPARTMENTS, DepartmentData } from '@/lib/constants';
import InternFormModal, { InternFormValues } from '@/app/components/AddIntern/page';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

async function resJsonSafe<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Server returned non-JSON response: ${text.slice(0, 120)}`);
  }
}

export default function AddInternPage() {
  const { user, token } = useAuth();   // ← your branch: token for Authorization header
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── Redirect non-admins ────────────────────────────────────────────────────
  if (user && user.role !== 'admin') {
    router.replace('/interns');
    return null;
  }

  // ── Departments via GraphQL (your branch) ──────────────────────────────────
  // Replaces Harshil's fetch('/api/departments') entirely.
  const { data: deptData, loading: deptsLoading, error: deptGqlError } = useQuery<{
    departments: DepartmentData[];
  }>(GET_DEPARTMENTS, { skip: IS_DEMO });

  const departments: DepartmentData[] = IS_DEMO
    ? DEMO_DEPARTMENTS
    : (deptData?.departments ?? []);

  const deptsError = deptGqlError?.message ?? null;

  // ── Refetch hooks (your branch) ────────────────────────────────────────────
  const { refetch: refetchInterns } = useQuery(GET_INTERNS, {
    variables: { where: {}, order_by: [{ created_at: 'desc' }] },
    skip: IS_DEMO,
  });
  const { refetch: refetchStats } = useQuery(GET_DASHBOARD_STATS, { skip: IS_DEMO });

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!IS_DEMO && deptsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showNoDepartments = !IS_DEMO && !deptsLoading && !deptsError && departments.length === 0;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (values: InternFormValues) => {
    setSubmitting(true);
    setError('');
    try {
      if (IS_DEMO) {
        demoStore.create({
          name:          values.name.trim(),
          email:         values.email.trim().toLowerCase(),
          phone:         values.phone || undefined,
          college:       values.college.trim(),
          degree:        values.degree?.trim() ?? '',
          branch:        values.branch?.trim() ?? '',
          department_id: values.department_id,
          start_date:    values.start_date,
          end_date:      values.end_date || undefined,
          status:        values.status,
        });
        router.push('/interns');
        return;
      }

      // ── your branch: send Authorization header so the API auth guard passes
      const res = await fetch('/api/interns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name:          values.name.trim(),
          email:         values.email.trim().toLowerCase(),
          phone:         values.phone ?? null,
          college:       values.college.trim(),
          degree:        values.degree?.trim() ?? '',
          branch:        values.branch?.trim() ?? '',
          department_id: values.department_id,
          start_date:    values.start_date,
          end_date:      values.end_date ?? null,
          status:        values.status,
        }),
      });

      const data = await resJsonSafe<{ message?: string }>(res).catch((e) => {
        if (res.ok) throw e;
        return { message: e instanceof Error ? e.message : 'Failed to add intern' };
      });
      if (!res.ok) throw new Error((data as { message?: string }).message || 'Failed to add intern');

      // ── your branch: refetch both lists so UI updates without a hard reload
      await Promise.all([refetchInterns(), refetchStats()]);
      router.push('/interns');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add intern');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        {/* Harshil's back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Add New Intern</h2>
        <p className="text-sm text-slate-500 mt-1">Fill in the details to register a new intern</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {!IS_DEMO && deptsError && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          {deptsError}
        </div>
      )}

      {showNoDepartments && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          No departments found in Hasura. Seed the <code>departments</code> table first.
        </div>
      )}

      <InternFormModal
        isOpen={true}
        isInline={true}
        onClose={() => router.push('/interns')}
        onSubmit={handleSubmit}
        initialData={null}
        departments={departments}
        submitting={submitting}
      />
    </div>
  );
}