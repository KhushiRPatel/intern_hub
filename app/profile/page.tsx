'use client';
import { useAuth } from '@/app/context/AuthContext';
import { Avatar } from '@/app/components/ui/Avatar';
import { RoleBadge } from '@/app/components/ui/Badge';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3.5
      border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide
        text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
        {value ?? (
          <span className="text-slate-400 dark:text-slate-600 font-normal italic">Not set</span>
        )}
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-sm">
        Loading profile…
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    department_person: 'Department Person',
    intern: 'Intern',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5 animate-[fade-in_0.3s_ease]">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your account details</p>
      </div>

      {/* Profile card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm
        border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Card header — avatar + name side by side */}
        <div className="flex items-center gap-4 px-6 py-5
          border-b border-slate-100 dark:border-slate-800
          bg-gradient-to-r from-primary-600/10 via-primary-400/5 to-transparent">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
              {user.name}
            </h2>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <RoleBadge role={user.role} />
              {user.department_name && (
                <span className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700
                  dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                  {user.department_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="px-6 py-2 divide-y divide-slate-100 dark:divide-slate-800">
          <InfoRow label="Full Name" value={user.name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Role" value={roleLabel[user.role] ?? user.role} />
          <InfoRow label="Department" value={user.department_name} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Account Type',
            value: roleLabel[user.role] ?? user.role,
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            ),
            color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400',
          },
          {
            label: 'Department',
            value: user.department_name ?? 'All Departments',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            ),
            color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400',
          },
          {
            label: 'Status',
            value: 'Active',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
            color: 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400',
          },
        ].map(card => (
          <div key={card.label}
            className="bg-white dark:bg-slate-900 rounded-2xl
              border border-slate-200 dark:border-slate-800 p-5
              flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                {card.icon}
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{card.label}</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
