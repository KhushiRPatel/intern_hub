'use client';
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/app/context/AuthContext';
import { Modal } from '@/app/components/ui/Modal';
import { Avatar } from '@/app/components/ui/Avatar';
import { StatusBadge, DeptBadge } from '@/app/components/ui/Badge';
import { Spinner } from '@/app/components/ui/Spinner';
import { GET_INTERN_PROFILE } from '@/graphql/queries';
import { InternData } from '@/lib/constants';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/* ── helpers ──────────────────────────────────────────────────────────────── */
function fmt(d?: string | null) {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d));
  } catch { return d; }
}

function fmtMoney(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value));
}

function joinValues(values?: Array<string | null | undefined> | null) {
  const items = (values ?? []).map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  return items.length ? items.join(', ') : '—';
}

/* ── sub-components ───────────────────────────────────────────────────────── */
function InfoPill({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </span>
      {empty ? (
        <span className="text-sm text-slate-300 dark:text-slate-600 font-normal italic">—</span>
      ) : (
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {value}
        </div>
      )}
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
      {title}
    </h4>
  );
}

function UrlValue({ value }: { value?: string | null }) {
  if (!value) return <span className="text-sm text-slate-300 dark:text-slate-600 font-normal italic">—</span>;
  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline break-all"
    >
      {value}
    </a>
  );
}

/* ── task priority / status configs ──────────────────────────────────────── */
const PRIORITY_CFG: Record<string, { label: string; cls: string }> = {
  low:      { label: 'Low',      cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  medium:   { label: 'Medium',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  high:     { label: 'High',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  critical: { label: 'Critical', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const TASK_STATUS_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  open:        { label: 'Open',        cls: 'text-slate-500 dark:text-slate-400',   dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', cls: 'text-blue-600 dark:text-blue-400',     dot: 'bg-blue-500' },
  on_hold:     { label: 'On Hold',     cls: 'text-amber-600 dark:text-amber-400',   dot: 'bg-amber-500' },
  completed:   { label: 'Completed',   cls: 'text-green-600 dark:text-green-400',   dot: 'bg-green-500' },
  cancelled:   { label: 'Cancelled',   cls: 'text-red-600 dark:text-red-400',       dot: 'bg-red-500' },
  // legacy values from GraphQL schema kept for safety
  todo:        { label: 'To Do',       cls: 'text-slate-500 dark:text-slate-400',   dot: 'bg-slate-400' },
  in_review:   { label: 'In Review',   cls: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
  done:        { label: 'Done',        cls: 'text-green-600 dark:text-green-400',   dot: 'bg-green-500' },
  blocked:     { label: 'Blocked',     cls: 'text-red-600 dark:text-red-400',       dot: 'bg-red-500' },
};

function TaskRow({ task, onClick }: { task: Record<string, any>; onClick: () => void }) {
  const p = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium;
  const s = TASK_STATUS_CFG[task.status] ?? TASK_STATUS_CFG.open;
  const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && task.status !== 'done';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-green-50/60 dark:hover:bg-green-900/10 transition-colors group"
    >
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
            {task.title}
          </p>
          {/* open-in-new icon */}
          <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
        {task.description && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1 text-left">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className={`text-[0.65rem] font-semibold ${s.cls}`}>{s.label}</span>
          <span className={`inline-block px-1.5 py-0.5 rounded-md text-[0.65rem] font-semibold ${p.cls}`}>{p.label}</span>
          {task.due_date && (
            <span className={`text-[0.65rem] font-medium ${overdue ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
              {overdue ? `⚠ Overdue · ${fmt(task.due_date)}` : `Due ${fmt(task.due_date)}`}
            </span>
          )}
          {task.estimated_hours ? (
            <span className="text-[0.65rem] text-slate-400 dark:text-slate-500">~{task.estimated_hours}h</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

/* ── main modal ───────────────────────────────────────────────────────────── */
interface Props {
  intern: InternData | null;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onEdit?: (intern: InternData) => void;
  userRole?: string;
}

export default function InternDetailModal({ intern, departments, onClose, onEdit, userRole }: Props) {
  const isOpen = !!intern;
  const { token } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'details' | 'tasks'>('details');
  const [detailTab, setDetailTab] = useState<'personal' | 'academic' | 'internship' | 'skills' | 'links' | 'reference' | 'notes'>('personal');

  /* ── extended profile (Hasura GraphQL via admin secret — profile only) ── */
  const { data: profileData, loading: profileLoading } = useQuery<{ interns_by_pk: Record<string, any> }>(
    GET_INTERN_PROFILE,
    {
      variables: { id: intern?.id },
      skip: IS_DEMO || !isOpen || !intern?.id,
      fetchPolicy: 'cache-and-network',
    },
  );

  /* ── tasks: use the same REST route the TaskDashboard uses ── */
  const [tasks, setTasks]           = useState<Record<string, any>[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksFetched, setTasksFetched] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!token || !intern?.id || IS_DEMO) return;
    setTasksLoading(true);
    try {
      // Fetch ALL tasks the logged-in user can see, then filter by this intern
      const res  = await fetch('/api/tasks/get', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tasks');

      // Keep only tasks that include this intern's id in intern_ids
      const filtered = (data.tasks as Record<string, any>[]).filter(t =>
        Array.isArray(t.intern_ids) && t.intern_ids.includes(intern.id),
      );
      setTasks(filtered);
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
      setTasksFetched(true);
    }
  }, [token, intern?.id]);

  // Fetch tasks the first time the Tasks tab is opened
  useEffect(() => {
    if (activeTab === 'tasks' && !tasksFetched && isOpen) {
      fetchTasks();
    }
  }, [activeTab, tasksFetched, isOpen, fetchTasks]);

  // Reset state when the viewed intern changes
  useEffect(() => {
    setActiveTab('details');
    setDetailTab('personal');
    setTasks([]);
    setTasksFetched(false);
  }, [intern?.id]);

  // Navigate to the tasks page and open that specific task
  const handleTaskClick = useCallback((taskId: string) => {
    onClose(); // close this modal first
    router.push(`/dashboard/tasks?taskId=${taskId}`);
  }, [onClose, router]);

  const p = profileData?.interns_by_pk;
  const deptName = departments.find(d => d.id === intern?.department_id)?.name ?? '—';

  const tabs = [
    { id: 'details' as const, label: 'Details' },
    // { id: 'tasks'   as const, label: tasksFetched ? `Tasks (${tasks.length})` : 'Tasks' },
  ];

  return (
    <Modal open={isOpen} onClose={onClose} size="2xl" hideHeader>
      {!intern ? null : (
        <div className="flex flex-col max-h-[88vh]">

          {/* ── solid green header ── */}
          <div className="relative shrink-0 rounded-t-2xl px-6 pt-6 pb-5" style={{ backgroundColor: '#16a34a' }}>
            {/* close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* identity row */}
            <div className="flex items-center gap-4">
              <Avatar name={intern.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-white leading-tight truncate">{intern.name}</h2>
                <p className="text-green-100 text-sm mt-0.5 truncate">{intern.email}</p>
                {intern.phone && (
                  <p className="text-green-200 text-xs mt-0.5">{intern.phone}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <StatusBadge status={intern.status} />
                  <DeptBadge name={deptName} />
                </div>
              </div>

              {(userRole === 'admin' || userRole === 'department_person') && onEdit && (
                <button
                  onClick={() => { onClose(); onEdit(intern); }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors border border-white/20"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {/* quick info strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Start Date', value: fmt(intern.start_date) },
                { label: 'End Date',   value: intern.end_date ? fmt(intern.end_date) : 'Open-ended' },
                { label: 'College',    value: intern.college },
                { label: 'Degree',     value: intern.degree ?? '—' },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-0.5">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-green-200">{item.label}</span>
                  <span className="text-xs font-semibold text-white truncate">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── tabs ── */}
          <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'py-3 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-green-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── tab content ── */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 rounded-b-2xl">

            {/* DETAILS TAB */}
            {activeTab === 'details' && (
              <div className="p-6 space-y-6">
                {profileLoading ? (
                  <div className="flex justify-center py-8"><Spinner size="lg" label="Loading details…" /></div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                      {[
                        { id: 'personal' as const, label: 'Personal' },
                        { id: 'academic' as const, label: 'Academic' },
                        { id: 'internship' as const, label: 'Internship' },
                        { id: 'skills' as const, label: 'Skills' },
                        { id: 'links' as const, label: 'Links' },
                        { id: 'reference' as const, label: 'Reference' },
                        { id: 'notes' as const, label: 'Notes' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDetailTab(tab.id)}
                          className={[
                            'px-3 py-1.5 rounded-full text-sm font-semibold transition-colors',
                            detailTab === tab.id
                              ? 'bg-primary-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                          ].join(' ')}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {detailTab === 'personal' && (
                      <div>
                        <SectionHead title="Personal Information" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4">
                          <InfoPill label="Phone"           value={p?.phone ?? intern.phone} />
                          <InfoPill label="Alternate Phone" value={p?.alternate_phone ?? intern.alternate_phone} />
                          <InfoPill label="Email"           value={intern.email} />
                          <InfoPill label="Date of Birth"   value={fmt(p?.date_of_birth)} />
                          <InfoPill label="Gender"          value={p?.gender ? String(p.gender).charAt(0).toUpperCase() + String(p.gender).slice(1) : undefined} />
                          <InfoPill label="Blood Group"     value={p?.blood_group} />
                          <InfoPill label="Nationality"     value={p?.nationality} />
                          <InfoPill label="Aadhar Number"   value={p?.aadhar_number} />
                          <InfoPill label="PAN Number"      value={p?.pan_number ? String(p.pan_number).toUpperCase() : undefined} />
                        </div>

                        <SectionHead title="Address" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4">
                          <InfoPill label="Address Line 1" value={p?.address_line1} />
                          <InfoPill label="Address Line 2" value={p?.address_line2} />
                          <InfoPill label="City"           value={p?.city} />
                          <InfoPill label="State"          value={p?.state} />
                          <InfoPill label="Pincode"        value={p?.pincode} />
                          <InfoPill label="Country"        value={p?.country} />
                        </div>
                      </div>
                    )}

                    {detailTab === 'academic' && (
                      <div>
                        <SectionHead title="Academic Details" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4">
                          <InfoPill label="College"         value={intern.college} />
                          <InfoPill label="University"      value={intern.university ?? p?.university} />
                          <InfoPill label="College Email"    value={p?.college_email} />
                          <InfoPill label="College City"     value={p?.college_city} />
                          <InfoPill label="College State"    value={p?.college_state} />
                          <InfoPill label="Degree"          value={intern.degree} />
                          <InfoPill label="Branch"          value={intern.branch} />
                          <InfoPill label="Specialization"  value={intern.specialization ?? p?.specialization} />
                          <InfoPill label="Graduation Year" value={intern.graduation_year ?? p?.graduation_year} />
                          <InfoPill label="Current Year"    value={p?.current_year} />
                          <InfoPill label="CGPA"            value={p?.cgpa} />
                          <InfoPill label="Percentage"      value={p?.percentage != null ? `${p.percentage}%` : undefined} />
                          <InfoPill label="Student ID"      value={p?.student_id} />
                        </div>
                      </div>
                    )}

                    {detailTab === 'internship' && (
                      <div>
                        <SectionHead title="Internship Details" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4">
                          <InfoPill label="Department"        value={deptName} />
                          <InfoPill label="Status"            value={p?.status ?? intern.status} />
                          <InfoPill label="Start Date"        value={fmt(p?.start_date ?? intern.start_date)} />
                          <InfoPill label="End Date"          value={p?.end_date ? fmt(p.end_date) : 'Open-ended'} />
                          <InfoPill label="Duration (Months)"  value={p?.duration_months ?? intern.duration_months} />
                          <InfoPill label="Work Mode"         value={p?.work_mode ?? intern.work_mode} />
                          <InfoPill label="Stipend"           value={fmtMoney(p?.stipend ?? intern.stipend)} />
                          <InfoPill label="Offer Letter Date" value={fmt(p?.offer_letter_date ?? intern.offer_letter_date)} />
                          <InfoPill label="Joining Letter Date" value={fmt(p?.joining_letter_date ?? intern.joining_letter_date)} />
                        </div>
                      </div>
                    )}

                    {detailTab === 'skills' && (
                      <div>
                        <SectionHead title="Skills & Tools" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4">
                          <InfoPill label="Skills"          value={joinValues(p?.skills ?? intern.skills)} />
                          <InfoPill label="Languages Known" value={joinValues(p?.languages_known ?? intern.languages_known)} />
                          <InfoPill label="Tools"           value={joinValues(p?.tools ?? intern.tools)} />
                        </div>
                      </div>
                    )}

                    {detailTab === 'links' && (
                      <div>
                        <SectionHead title="Social & Links" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4">
                          <InfoPill label="LinkedIn" value={<UrlValue value={p?.linkedin_url} />} />
                          <InfoPill label="GitHub" value={<UrlValue value={p?.github_url} />} />
                          <InfoPill label="Portfolio" value={<UrlValue value={p?.portfolio_url} />} />
                        </div>
                      </div>
                    )}

                    {detailTab === 'reference' && (
                      <div>
                        <SectionHead title="Reference" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4">
                          <InfoPill label="Reference Name" value={p?.reference_name} />
                          <InfoPill label="Reference Contact" value={p?.reference_contact} />
                        </div>
                      </div>
                    )}

                    {detailTab === 'notes' && (
                      <div>
                        <SectionHead title="Notes" />
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/30 p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-6">
                          {p?.notes ?? '—'}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
              <div>
                {IS_DEMO ? (
                  <div className="flex flex-col items-center justify-center py-14 text-slate-400 dark:text-slate-600">
                    <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm font-medium">Tasks unavailable in demo mode</p>
                  </div>

                ) : tasksLoading ? (
                  <div className="flex justify-center py-12"><Spinner size="lg" label="Loading tasks…" /></div>

                ) : tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-slate-400 dark:text-slate-600">
                    <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <p className="text-sm font-medium">No tasks assigned yet</p>
                    <p className="text-xs mt-1 text-slate-400 dark:text-slate-600">
                      Assign tasks from the Tasks section
                    </p>
                  </div>

                ) : (
                  <div>
                    {/* status summary bar */}
                    <div className="flex flex-wrap gap-4 px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20">
                      {Object.entries(TASK_STATUS_CFG)
                        // show only statuses that actually appear in this intern's tasks
                        .filter(([st]) => tasks.some(t => t.status === st))
                        // deduplicate (some legacy keys map to same label)
                        .filter(([, cfg], idx, arr) => arr.findIndex(([, c]) => c.label === cfg.label) === idx)
                        .map(([st, cfg]) => {
                          const cnt = tasks.filter(t => t.status === st).length;
                          if (!cnt) return null;
                          return (
                            <div key={st} className="flex items-center gap-1.5 text-xs">
                              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                              <span className={`font-medium ${cfg.cls}`}>{cfg.label}</span>
                              <span className="text-slate-400 dark:text-slate-600">({cnt})</span>
                            </div>
                          );
                        })}
                    </div>

                    {/* task rows */}
                    <div>
                      {tasks.map(t => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          onClick={() => handleTaskClick(t.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>{/* end tab content */}
        </div>
      )}
    </Modal>
  );
}
