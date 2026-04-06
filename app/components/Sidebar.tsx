'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useAppDispatch, useUI } from '@/lib/hooks';
import { toggleSidebar } from '@/lib/slices/uiSlice';
import { Avatar } from './ui/Avatar';
import { RoleBadge } from './ui/Badge';
import { Logo } from './ui/Logo';

/* ── Nav config ─────────────────────────────────────────────────────────────── */
const SECTIONS = [
  {
    label: 'MAIN MENU',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        roles: ['admin', 'department_person', 'intern'],
        icon: (
          <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        label: 'Interns',
        href: '/interns',
        roles: ['admin', 'department_person'],
        icon: (
          <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        label: 'Departments',
        href: '/users/departments',
        roles: ['admin'],
        icon: (
          <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        label: 'Dept. Persons',
        href: '/users/department-persons',
        roles: ['admin'],
        icon: (
          <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6-3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        label: 'Tasks',
        href: '/dashboard/tasks',
        roles: ['admin', 'department_person', 'intern'],
        icon: (
          <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
      },
      {
        label: 'AI Assistant',
        href: '/chatbot',
        roles: ['admin', 'department_person'],
        icon: (
          <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      {
        label: 'Add Intern',
        href: '/interns/add',
        roles: ['admin', 'department_person'],
        icon: (
          <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        ),
      },
      {
        label: 'Add Dept. Person',
        href: '/users/add-department-person',
        roles: ['admin'],
        icon: (
          <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
    ],
  },
];

const NAV_HREFS = [...SECTIONS.flatMap((s) => s.items.map((i) => i.href)), '/profile'];

function navHrefMatchesPath(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useUI();
  const pathname = usePathname();
  const { user } = useAuth();

  const matchingHrefs = NAV_HREFS.filter((h) => navHrefMatchesPath(h, pathname));
  const activeHref =
    matchingHrefs.length > 0
      ? matchingHrefs.reduce((a, b) => (a.length >= b.length ? a : b))
      : null;

  const isActive = (href: string) => href === activeHref;

  return (
    <aside className={`${
      sidebarOpen ? 'w-64' : 'w-0'
    } transition-all duration-300 flex flex-col shrink-0 h-full overflow-hidden
      bg-white dark:bg-slate-950
      border-r border-slate-200 dark:border-slate-800
    `}>
      {/* ── Brand ── */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <Logo iconSize={32} />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) =>
            item.roles.includes(user?.role ?? ''),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              <p className="text-[0.65rem] font-semibold tracking-widest px-3 mb-1.5 uppercase text-slate-400 dark:text-slate-600">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                        active
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-200 dark:shadow-primary-900/30'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200',
                      ].join(' ')}
                    >
                      {item.icon}
                      {item.label}
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Profile link (intern only) ── */}
      {user?.role === 'intern' && (
        <div className="px-3 pb-2 shrink-0">
          <p className="text-[0.65rem] font-semibold tracking-widest px-3 mb-1.5 uppercase text-slate-400 dark:text-slate-600">
            MY ACCOUNT
          </p>
          {(() => {
            const active = isActive('/profile');
            return (
              <Link
                href="/profile"
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-200 dark:shadow-primary-900/30'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200',
                ].join(' ')}
              >
                <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
              </Link>
            );
          })()}
        </div>
      )}

      {/* ── User card ── */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="rounded-xl p-3 flex items-center gap-3 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          {user && <Avatar name={user.name} size="sm" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate leading-none text-slate-800 dark:text-white">{user?.name}</p>
            <div className="mt-1">{user?.role && <RoleBadge role={user.role} />}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
