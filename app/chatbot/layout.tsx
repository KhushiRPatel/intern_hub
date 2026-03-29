'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import AppShell from '@/app/components/AppShell';

const ALLOWED_ROLES = ['admin', 'department_person'];

export default function ChatbotLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.replace('/dashboard'); // Interns get silently redirected
    }
  }, [user, isLoading, router]);

  // Show nothing while auth loads or if the user is unauthorized
  if (isLoading || !user || !ALLOWED_ROLES.includes(user.role)) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
