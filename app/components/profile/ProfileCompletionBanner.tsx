'use client';

import { useQuery } from '@apollo/client/react';
import { GET_INTERN_PROFILE } from '@/graphql/queries';
import Link from 'next/link';

export function ProfileCompletionBanner({ internId }: { internId: string }) {
  const { data, loading } = useQuery<any>(GET_INTERN_PROFILE, {
    variables: { id: internId },
    skip: !internId,
  });

  if (loading || !data?.interns_by_pk) return null;

  const intern = data.interns_by_pk;

  // Check if critical fields are missing (phone, address, pan/aadhar, college, etc)
  const isComplete = Boolean(
    intern.phone &&
    intern.college &&
    intern.degree &&
    intern.address_line1 &&
    intern.aadhar_number
  );

  if (isComplete) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 shadow-sm mt-0 mb-6 flex flex-col sm:flex-row items-center gap-4 justify-between animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex flex-shrink-0 items-center justify-center text-amber-600 dark:text-amber-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-amber-800 dark:text-amber-300 font-semibold text-sm">Profile Incomplete</h3>
          <p className="text-amber-700 dark:text-amber-400/80 text-xs mt-0.5 max-w-lg">
            Please complete your personal, academic, and identity details to access all system features fully.
            Missing records may affect task assignments or stipends.
          </p>
        </div>
      </div>
      <Link href="/profile" className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors shrink-0 text-center shadow-sm">
        Complete Profile
      </Link>
    </div>
  );
}
