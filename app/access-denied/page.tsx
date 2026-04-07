'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AccessDeniedPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const message = reason === 'invalid-session'
    ? 'Your session is invalid or expired. Please sign in again.'
    : 'You do not have permission to open this page.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L3.068 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors">
            Go to Dashboard
          </Link>
          <Link href="/login" className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}