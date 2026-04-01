'use client';
import { usePathname } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { ThemeToggle } from './ui/ThemeToggle';
import { Avatar } from './ui/Avatar';
import { RoleBadge } from './ui/Badge';
import { Logo } from './ui/Logo';

/* Map path prefixes → readable page names */
const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/interns/add': 'Add Intern',
  '/interns': 'Interns',
  '/users/add-department-person': 'Add Dept. Person',
  '/profile': 'Profile',
};

function getPageName(pathname: string) {
  const key = Object.keys(PAGE_NAMES)
    .filter(k => pathname === k || pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0];
  return PAGE_NAMES[key] ?? 'Dashboard';
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const pageName = getPageName(pathname);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-6 shrink-0 z-10
      bg-white dark:bg-slate-900
      border-b border-slate-200 dark:border-slate-800
    ">

      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <Logo iconSize={26} className="hidden sm:flex" />
        <svg className="w-3 h-3 text-slate-300 dark:text-slate-700 hidden sm:block shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm truncate">
          {pageName}
        </span>
        {user?.department_name && (
          <span className="hidden md:inline text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-lg font-medium ml-1">
            {user.department_name}
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-0.5">

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell */}
        {/* <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors
            text-slate-500 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-slate-800
            hover:text-slate-700 dark:hover:text-slate-200
          "
          title="Notifications"
        >
          <svg className="w-[1.1rem] h-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-white dark:border-slate-900" />
        </button> */}

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-2.5 px-2 py-1 rounded-xl transition-colors
              hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {user && <Avatar name={user.name} size="sm" />}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold leading-none text-slate-800 dark:text-slate-200">
                {user?.name}
              </p>
              <div className="mt-0.5">
                {user?.role && <RoleBadge role={user.role} />}
              </div>
            </div>
            {/* Chevron */}
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl shadow-lg ring-1 ring-black/5
              bg-white dark:bg-slate-900
              border border-slate-100 dark:border-slate-800
              py-1 z-50 animate-[fade-in_0.15s_ease]"
            >
              {/* User info header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300
                    hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </Link>

              </div>

              {/* Divider + Logout */}
              <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                    text-red-600 dark:text-red-400
                    hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
