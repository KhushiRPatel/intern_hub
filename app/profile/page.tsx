'use client';
import { useAuth } from '@/app/context/AuthContext';
import { useAppDispatch, useUI } from '@/lib/hooks';
import { openProfileEditModal, closeProfileEditModal } from '@/lib/slices/uiSlice';
import { useQuery } from '@apollo/client/react';
import { GET_INTERN_PROFILE } from '@/graphql/queries';
import { Avatar } from '@/app/components/ui/Avatar';
import { RoleBadge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Spinner } from '@/app/components/ui/Spinner';
import { InternProfileModal } from '@/app/components/profile/InternProfileModal';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/* ── Status badge ─────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-slate-400 italic text-xs">—</span>;
  const map: Record<string, string> = {
    active:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    completed:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

/* ── Single info row ──────────────────────────────────────────────────────── */
function InfoRow({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-3
      border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide
        text-slate-400 dark:text-slate-500 pt-0.5">
        {label}
      </span>
      {empty ? (
        <span className="text-sm text-slate-300 dark:text-slate-600 italic font-normal">Not set</span>
      ) : (
        <span className={`text-sm text-slate-800 dark:text-slate-200 font-medium break-all ${mono ? 'font-mono' : ''}`}>
          {String(value)}
        </span>
      )}
    </div>
  );
}

/* ── Link row ─────────────────────────────────────────────────────────────── */
function LinkRow({ label, value }: { label: string; value?: string | null }) {
  const empty = !value;
  const href = value && !/^https?:\/\//i.test(value) ? `https://${value}` : value;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-3
      border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide
        text-slate-400 dark:text-slate-500 pt-0.5">
        {label}
      </span>
      {empty ? (
        <span className="text-sm text-slate-300 dark:text-slate-600 italic font-normal">Not set</span>
      ) : (
        <a
          href={href!}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium break-all"
        >
          {value}
        </a>
      )}
    </div>
  );
}

/* ── Section wrapper ──────────────────────────────────────────────────────── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
        <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      </div>
      <div className="px-6 py-1 divide-y divide-slate-100 dark:divide-slate-800">
        {children}
      </div>
    </div>
  );
}

/* ── Format date helper ───────────────────────────────────────────────────── */
function fmtDate(val?: string | null) {
  if (!val) return null;
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(val));
  } catch { return val; }
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const { showProfileEditModal } = useUI();

  const isIntern = user?.role === 'intern';

  const { data, loading, error, refetch } = useQuery<{ interns_by_pk: Record<string, unknown> }>(
    GET_INTERN_PROFILE,
    {
      variables: { id: user?.intern_id },
      skip: IS_DEMO || !isIntern || !user?.intern_id,
      fetchPolicy: 'cache-and-network',
    },
  );

  const p = data?.interns_by_pk as Record<string, any> | undefined;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500 text-sm">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5 animate-[fade-in_0.3s_ease]">

      {/* ── Page header ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Profile</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isIntern ? 'Your complete intern profile' : 'Your account details'}
          </p>
        </div>
        {isIntern && user.intern_id && (
          <Button onClick={() => dispatch(openProfileEditModal())}>
            <svg className="w-4 h-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
            </svg>
            Edit Profile
          </Button>
        )}
      </div>

      {/* ── Identity card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-5 px-6 py-5">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">{user.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <RoleBadge role={user.role} />
              {user.department_name && (
                <span className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium border border-blue-100 dark:border-blue-800">
                  {user.department_name}
                </span>
              )}
              {isIntern && p?.status && <StatusBadge status={p.status as string} />}
            </div>
          </div>
          {isIntern && p && (
            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-right">
              {p.start_date && (
                <span className="text-xs text-slate-400">
                  Joined <span className="font-medium text-slate-600 dark:text-slate-300">{fmtDate(p.start_date as string)}</span>
                </span>
              )}
              {p.end_date && (
                <span className="text-xs text-slate-400">
                  Ends <span className="font-medium text-slate-600 dark:text-slate-300">{fmtDate(p.end_date as string)}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Loading / error states ── */}
      {isIntern && loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" label="Loading profile data…" />
        </div>
      )}
      {isIntern && error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error.message}
        </div>
      )}

      {/* ── Intern detail sections ── */}
      {isIntern && !loading && !error && (
        <>
          {/* Personal & Identity */}
          <Section
            title="Personal & Identity"
            icon={
              <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          >
            <InfoRow label="Phone"           value={p?.phone as string} />
            <InfoRow label="Alternate Phone" value={p?.alternate_phone as string} />
            <InfoRow label="Date of Birth"   value={fmtDate(p?.date_of_birth as string)} />
            <InfoRow label="Gender"          value={p?.gender ? String(p.gender).charAt(0).toUpperCase() + String(p.gender).slice(1) : null} />
            <InfoRow label="Blood Group"     value={p?.blood_group as string} />
            <InfoRow label="Nationality"     value={p?.nationality as string} />
            <InfoRow label="Aadhar Number"   value={p?.aadhar_number as string} mono />
            <InfoRow label="PAN Number"      value={p?.pan_number ? String(p.pan_number).toUpperCase() : null} mono />
          </Section>

          {/* Address Details */}
          <Section
            title="Address Details"
            icon={
              <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          >
            <InfoRow label="Address Line 1"  value={p?.address_line1 as string} />
            <InfoRow label="Address Line 2"  value={p?.address_line2 as string} />
            <InfoRow label="City"            value={p?.city as string} />
            <InfoRow label="State"           value={p?.state as string} />
            <InfoRow label="Pincode"         value={p?.pincode as string} />
            <InfoRow label="Country"         value={p?.country as string} />
          </Section>

          {/* Academic Details */}
          <Section
            title="Academic Details"
            icon={
              <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422A12.083 12.083 0 0121 21H3a12.083 12.083 0 012.84-10.422L12 14z" />
              </svg>
            }
          >
            <InfoRow label="College/Institute" value={p?.college as string} />
            <InfoRow label="University"         value={p?.university as string} />
            <InfoRow label="Degree"             value={p?.degree as string} />
            <InfoRow label="Branch"             value={p?.branch as string} />
            <InfoRow label="Specialization"     value={p?.specialization as string} />
            <InfoRow label="Graduation Year"    value={p?.graduation_year as number} />
            <InfoRow label="Current Year"       value={p?.current_year as number} />
            <InfoRow label="CGPA"               value={p?.cgpa as number} />
            <InfoRow label="Percentage"         value={p?.percentage != null ? `${p.percentage}%` : null} />
            <InfoRow label="College Student ID" value={p?.student_id as string} mono />
          </Section>

          {/* Social & Links */}
          <Section
            title="Social & Links"
            icon={
              <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
          >
            <LinkRow label="LinkedIn URL"    value={p?.linkedin_url as string} />
            <LinkRow label="GitHub URL"      value={p?.github_url as string} />
            <LinkRow label="Portfolio"       value={p?.portfolio_url as string} />
          </Section>
        </>
      )}

      {/* ── Non-intern basic info ── */}
      {!isIntern && (
        <Section
          title="Account Information"
          icon={
            <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        >
          <InfoRow label="Full Name"   value={user.name} />
          <InfoRow label="Email"       value={user.email} />
          <InfoRow label="Role"        value={{ admin: 'Admin', department_person: 'Department Person', intern: 'Intern' }[user.role] ?? user.role} />
          <InfoRow label="Department"  value={user.department_name} />
        </Section>
      )}

      {/* ── Empty state prompt for intern with no data ── */}
      {isIntern && !loading && !error && !p && (
        <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <svg className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No profile data yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Click <strong>Edit Profile</strong> to fill in your details</p>
        </div>
      )}

      {/* ── Edit modal ── */}
      {isIntern && user.intern_id && (
        <InternProfileModal
          isOpen={showProfileEditModal}
          onClose={() => { dispatch(closeProfileEditModal()); refetch(); }}
          internId={user.intern_id}
        />
      )}
    </div>
  );
}
