'use client';
import { useAuth } from '@/app/context/AuthContext';
import { useNavigation } from '@/app/context/NavigationContext';
import { demoStore } from '@/lib/demoStore';
import { ROLE_LABELS } from '@/lib/constants';
import { useQuery } from '@apollo/client/react';
import { GET_DASHBOARD_STATS } from '@/graphql/queries';
import { StatCard } from './StatCard';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export function DashboardView() {
    const { user } = useAuth();
    const { setCurrentView } = useNavigation();

    type DashboardStats = {
        total: { aggregate: { count: number } };
        active: { aggregate: { count: number } };
        completed: { aggregate: { count: number } };
        terminated: { aggregate: { count: number } };
    };

    const { data: gqlData, loading: statsLoading } = useQuery<DashboardStats>(GET_DASHBOARD_STATS, {
        skip: IS_DEMO,
    });

    const stats = IS_DEMO
        ? demoStore.getStats()
        : {
            total: gqlData?.total?.aggregate?.count ?? 0,
            active: gqlData?.active?.aggregate?.count ?? 0,
            completed: gqlData?.completed?.aggregate?.count ?? 0,
            terminated: gqlData?.terminated?.aggregate?.count ?? 0,
        };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {!IS_DEMO && statsLoading && (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Welcome banner */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
                <p className="text-blue-200 text-sm font-medium">Welcome back,</p>
                <h2 className="text-2xl font-bold mt-1">{user?.name}</h2>
                <p className="text-blue-200 text-sm mt-1">
                    Role: <span className="font-semibold text-white">{ROLE_LABELS[user?.role ?? 'intern']}</span>
                    {user?.department_name && (
                        <> · Department: <span className="font-semibold text-white">{user.department_name}</span></>
                    )}
                </p>
            </div>

            {/* Stats */}
            <div>
                <h3 className="text-slate-700 font-semibold text-base mb-4">Overview</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Interns" value={stats.total}
                        color="bg-blue-100"
                        icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    />
                    <StatCard
                        label="Active" value={stats.active}
                        color="bg-green-100"
                        icon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <StatCard
                        label="Completed" value={stats.completed}
                        color="bg-sky-100"
                        icon={<svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    />
                    <StatCard
                        label="Terminated" value={stats.terminated}
                        color="bg-red-100"
                        icon={<svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                    />
                </div>
            </div>
        </div>
    );
}
