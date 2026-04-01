'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { GET_DEPARTMENTS, GET_INTERNS, GET_DASHBOARD_STATS } from '@/graphql/queries';
import { useAuth } from '@/app/context/AuthContext';
import { useAppDispatch } from '@/lib/hooks';
import { openAddInternModal, closeAddInternModal } from '@/lib/slices/uiSlice';
import { demoStore } from '@/lib/demoStore';
import { DEMO_DEPARTMENTS, DepartmentData } from '@/lib/constants';
import InternFormModal, { InternFormValues } from '@/app/components/AddIntern/page';
import {
  internFormValuesToCreateApiBody,
  internFormValuesToDemoPayload,
  resolveInternFormDepartmentId,
} from '@/lib/internForm';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

async function resJsonSafe<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try { return JSON.parse(text) as T; }
  catch { throw new Error(`Server returned non-JSON response: ${text.slice(0, 120)}`); }
}

export default function AddInternPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Open modal when component mounts, close when unmounting
  useEffect(() => {
    dispatch(openAddInternModal());
    return () => {
      dispatch(closeAddInternModal());
    };
  }, [dispatch]);

  const isAdmin      = user?.role === 'admin';
  const isDeptPerson = user?.role === 'department_person';

  // ── Redirect interns ──────────────────────────────────────────────────────
  if (user && !isAdmin && !isDeptPerson) {
    router.replace('/interns');
    return null;
  }

  // ── Departments via GraphQL ───────────────────────────────────────────────
  const { data: deptData, loading: deptsLoading, error: deptGqlError } = useQuery<{
    departments: DepartmentData[];
  }>(GET_DEPARTMENTS, { skip: IS_DEMO });

  const allDepartments: DepartmentData[] = IS_DEMO ? DEMO_DEPARTMENTS : (deptData?.departments ?? []);

  // department_person only sees their own department
  const departments: DepartmentData[] = isDeptPerson && user?.department_id
    ? allDepartments.filter(d => d.id === user.department_id)
    : allDepartments;

  const deptsError = deptGqlError?.message ?? null;

  // ── Refetch hooks ─────────────────────────────────────────────────────────
  const { refetch: refetchInterns } = useQuery(GET_INTERNS, {
    variables: { where: {}, order_by: [{ created_at: 'desc' }] },
    skip: IS_DEMO,
  });
  const { refetch: refetchStats } = useQuery(GET_DASHBOARD_STATS, { skip: IS_DEMO });

  if (!IS_DEMO && deptsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showNoDepartments = !IS_DEMO && !deptsLoading && !deptsError && departments.length === 0;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (values: InternFormValues) => {
    setSubmitting(true);
    setError('');
    try {
      const department_id = resolveInternFormDepartmentId(values, {
        isDeptPerson: isDeptPerson,
        userDepartmentId: user?.department_id,
      });

      if (IS_DEMO) {
        demoStore.create(internFormValuesToDemoPayload(values, department_id));
        router.push('/interns');
        return;
      }

      const res = await fetch('/api/interns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(internFormValuesToCreateApiBody(values, department_id)),
      });

      const data = await resJsonSafe<{ message?: string }>(res).catch((e) => {
        if (res.ok) throw e;
        return { message: e instanceof Error ? e.message : 'Failed to add intern' };
      });
      if (!res.ok) throw new Error((data as { message?: string }).message || 'Failed to add intern');

      await Promise.all([refetchInterns(), refetchStats()]);
      dispatch(closeAddInternModal());
      router.push('/interns');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add intern');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    dispatch(closeAddInternModal());
    router.push('/interns');
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 pb-12">
      <div className="mb-8">
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Add new intern</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
          {isDeptPerson
            ? `Interns are added under ${departments[0]?.name ?? 'your department'}. Complete each section below.`
            : 'Capture personal, academic, and placement details. Required fields are marked with an asterisk.'}
        </p>
      </div>

      {/* department_person: locked department banner */}
      {isDeptPerson && departments[0] && (
        <div className="mb-4 flex items-center gap-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/40 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-sm text-primary-700 dark:text-primary-300">
            Intern will be added to <span className="font-semibold">{departments[0].name}</span>
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
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
          No departments found. Seed the <code>departments</code> table first.
        </div>
      )}

      <InternFormModal
        isOpen={true}
        isInline={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialData={null}
        departments={departments}
        submitting={submitting}
      />
    </div>
  );
}