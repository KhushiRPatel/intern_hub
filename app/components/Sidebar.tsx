'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useNavigation, type PageView } from '@/app/context/NavigationContext';
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/constants';

const NAV = [
    {
        label: 'Dashboard',
        view: 'dashboard' as PageView,
        roles: ['admin', 'department_person', 'intern'],
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        label: 'Interns',
        view: 'interns' as PageView,
        roles: ['admin', 'department_person', 'intern'],
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        label: 'Tasks',
        view: 'tasks' as PageView,
        roles: ['admin', 'department_person', 'intern'],
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        ),
    },
    {
        label: 'Add Intern',
        view: 'add-intern' as PageView,
        roles: ['admin'],
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
        ),
    },
    {
        label: 'Department Persons',
        view: 'add-dept-person' as PageView,
        roles: ['admin'],
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-9h-1M5 12H4m2 6l1-1m10-10l1-1M6 6l1 1m10 10l1 1" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7c-2.5 0-4.5 2-4.5 4.5S9.5 16 12 16s4.5-2 4.5-4.5S14.5 7 12 7z" />
            </svg>
        ),
    },
];

export default function Sidebar() {
    const { user } = useAuth();
    const { currentView, setCurrentView } = useNavigation();

    const visible = NAV.filter((n) => n.roles.includes(user?.role ?? ''));

    return (
        <aside className="w-64 bg-slate-800 flex flex-col shrink-0 h-full">
            {/* Brand */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-700">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <span className="text-white font-bold text-lg">InternMS</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
                {visible.map((item) => {
                    const active = currentView === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => setCurrentView(item.view)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${active
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* User card */}
            <div className="p-4 border-t border-slate-700">
                <div className="bg-slate-700 rounded-xl p-3 space-y-1">
                    <p className="text-slate-400 text-xs">Signed in as</p>
                    <p className="text-white font-semibold text-sm truncate">{user?.name}</p>
                    {user?.department_name && (
                        <p className="text-slate-300 text-xs">{user.department_name} Dept.</p>
                    )}
                    <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[user?.role ?? 'intern']
                            }`}
                    >
                        {ROLE_LABELS[user?.role ?? 'intern']}
                    </span>
                </div>
            </div>
        </aside>
    );
}
