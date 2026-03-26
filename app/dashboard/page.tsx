'use client';
import { useAuth } from '@/app/context/AuthContext';
import { demoStore } from '@/lib/demoStore';
import { ROLE_LABELS } from '@/lib/constants';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { GET_DASHBOARD_STATS } from '@/graphql/queries';
import { StatCard } from '@/app/components/ui/Card';
import { Avatar } from '@/app/components/ui/Avatar';
import { Spinner } from '@/app/components/ui/Spinner';
import { RoleBadge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

type DashboardStats = {
  total: { aggregate: { count: number } };
  active: { aggregate: { count: number } };
  completed: { aggregate: { count: number } };
  terminated: { aggregate: { count: number } };
};

/* ── Quick action card ──────────────────────────────────────────────────────── */
function QuickAction({
  href, title, desc, iconBg, icon,
}: {
  href: string; title: string; desc: string; iconBg: string; icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary-100 dark:hover:border-primary-900/50 transition-all duration-200 flex items-center gap-4"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{desc}</p>
      </div>
      <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto shrink-0 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();

  const { data: gqlData, loading: statsLoading } = useQuery<DashboardStats>(GET_DASHBOARD_STATS, {
    skip: IS_DEMO,
  });

  const stats = IS_DEMO
    ? demoStore.getStats()
    : {
      total:      gqlData?.total?.aggregate?.count      ?? 0,
      active:     gqlData?.active?.aggregate?.count     ?? 0,
      completed:  gqlData?.completed?.aggregate?.count  ?? 0,
      terminated: gqlData?.terminated?.aggregate?.count ?? 0,
    };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">

      {/* ── Welcome banner ── */}
      <div className="relative overflow-hidden bg-slate-950 dark:bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary-600/10 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-primary-900/20 rounded-full translate-y-1/2 blur-2xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {user && <Avatar name={user.name} size="lg" />}
            <div>
              <p className="text-slate-400 text-sm">Welcome back,</p>
              <h2 className="text-2xl font-bold text-white mt-0.5">{user?.name}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {user?.role && <RoleBadge role={user.role} />}
                {user?.department_name && (
                  <span className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-lg">
                    {user.department_name} Dept.
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-right shrink-0">
            <p className="text-slate-500 text-xs">{ROLE_LABELS[user?.role ?? 'intern']}</p>
            <p className="text-slate-300 text-sm font-medium mt-0.5 truncate max-w-48">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Overview</h3>
          <Link href="/interns" className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium transition-colors">
            View all →
          </Link>
        </div>

        {!IS_DEMO && statsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" label="Loading stats…" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
            <StatCard
              label="Total Interns"
              value={stats.total}
              iconBg="bg-slate-100 dark:bg-slate-800"
              icon={
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <StatCard
              label="Active"
              value={stats.active}
              iconBg="bg-primary-100 dark:bg-primary-900/30"
              icon={
                <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              iconBg="bg-blue-100 dark:bg-blue-900/30"
              icon={
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              }
            />
            <StatCard
              label="Terminated"
              value={stats.terminated}
              iconBg="bg-red-100 dark:bg-red-900/30"
              icon={
                <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
            />
          </div>
        )}
      </div>

      {/* ── Quick access ── */}
      <div>
        <h3 className="text-slate-700 dark:text-slate-300 font-semibold text-sm mb-4">Quick Access</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction
            href="/interns"
            title="View All Interns"
            desc="Filter, search and manage intern records"
            iconBg="bg-slate-100 dark:bg-slate-800 group-hover:bg-primary-600"
            icon={
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            }
          />
          {isAdmin && (
            <>
              <QuickAction
                href="/interns/add"
                title="Add New Intern"
                desc="Register a new intern with auto-account creation"
                iconBg="bg-primary-50 dark:bg-primary-900/20 group-hover:bg-primary-600"
                icon={
                  <svg className="w-5 h-5 text-primary-600 dark:text-primary-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                }
              />
              <QuickAction
                href="/users/add-department-person"
                title="Add Dept. Person"
                desc="Create a new department manager account"
                iconBg="bg-purple-50 dark:bg-purple-900/20 group-hover:bg-purple-600"
                icon={
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
              />
            </>
          )}
        </div>
      </div>

      {/* ── Demo notice ── */}
      {IS_DEMO && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">Demo Mode Active</p>
            <p className="text-amber-600 dark:text-amber-500 text-xs mt-0.5">
              Data is stored in localStorage. Set{' '}
              <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">NEXT_PUBLIC_DEMO_MODE=false</code>{' '}
              to connect to Hasura.
            </p>
          </div>
          <Link href="/login" className="ml-auto shrink-0">
            <Button variant="outline" size="xs">Switch account</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
