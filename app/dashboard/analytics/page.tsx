'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/app/context/AuthContext';

const SupersetDashboard = dynamic(
  () => import('@/app/components/SupersetDashboard'),
  { ssr: false },
);

const STORAGE_KEY = 'fc9a36df-9415-46fc-b682-e8d5417bb273';
const SUPERSET_URL = process.env.NEXT_PUBLIC_SUPERSET_URL ?? 'http://localhost:8088';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [inputId, setInputId] = useState('');
  const [activeDashboardId, setActiveDashboardId] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Load persisted dashboard ID from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setInputId(saved);
      setActiveDashboardId(saved);
    } else {
      setEditMode(true);
    }
  }, []);

  if (!user || !['admin', 'department_person'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 dark:text-slate-400">
        You do not have access to this page.
      </div>
    );
  }

  const handleLoad = () => {
    const id = inputId.trim();
    if (!id) return;
    localStorage.setItem(STORAGE_KEY, id);
    setActiveDashboardId(id);
    setEditMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLoad();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Embed any Superset dashboard — build charts at{' '}
            <a
              href={SUPERSET_URL}
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              {SUPERSET_URL}
            </a>
          </p>
        </div>

        {activeDashboardId && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Change dashboard
          </button>
        )}
      </div>

      {/* Dashboard ID input */}
      {(editMode || !activeDashboardId) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Enter Superset Dashboard ID
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            In Superset → open the dashboard → click <strong>⋮</strong> → <strong>Embed dashboard</strong> → copy the UUID.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
              className="flex-1 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleLoad}
              disabled={!inputId.trim()}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Load
            </button>
            {activeDashboardId && (
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Setup instructions (shown only when no dashboard loaded yet) */}
          {!activeDashboardId && (
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Quick setup guide
              </p>
              <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {[
                  <>Open <a href={SUPERSET_URL} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{SUPERSET_URL}</a> and log in as <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">admin / admin123</code></>,
                  <>Go to <strong>Data → Databases → + Database</strong> and connect to <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">postgresql://chatbot:chatbot123@localhost:5433/intern_management</code></>,
                  <>Create a <strong>Dataset</strong> from any table (e.g. <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">interns</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">tasks</code>)</>,
                  <>Build <strong>Charts</strong> from the dataset and add them to a <strong>Dashboard</strong></>,
                  <>In the dashboard, click <strong>⋮ → Embed dashboard</strong> and enable embedding, then copy the UUID above</>,
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 text-[0.7rem] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Embedded dashboard */}
      {activeDashboardId && !editMode && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <SupersetDashboard dashboardId={activeDashboardId} />
        </div>
      )}
    </div>
  );
}
