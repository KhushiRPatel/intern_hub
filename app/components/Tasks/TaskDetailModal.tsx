'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Task } from '@/app/context/TaskContext';
import { UserRole } from '@/lib/constants';

interface Comment {
  id: string;
  comment: string;
  user_id: string;
  created_at: string;
  user: { id: string; name: string; role: string };
}

interface Activity {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  user_id: string;
  created_at: string;
  user: { id: string; name: string; role: string };
}

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  userRole?: UserRole;
}

type Tab = 'details' | 'comments' | 'activity';

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtTime = (d: string) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const fmtRelative = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return fmtDate(date);
};

const Avatar: React.FC<{ name: string; size?: 'xs' | 'sm' }> = ({ name, size = 'sm' }) => {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-primary-500', 'bg-indigo-500', 'bg-blue-500', 'bg-violet-500', 'bg-teal-500'];
  const color  = colors[name.charCodeAt(0) % colors.length];
  const sz     = size === 'xs' ? 'w-6 h-6 text-[0.6rem]' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}>
      {initials}
    </div>
  );
};

const PRIORITY_STYLES: Record<string, string> = {
  low:      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  medium:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  high:     'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  critical: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

const STATUS_STYLES: Record<string, string> = {
  open:        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  in_progress: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  completed:   'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
  on_hold:     'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  cancelled:   'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400',
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  token,
  userRole = 'intern',
}) => {
  const [activeTab,    setActiveTab]    = useState<Tab>('details');
  const [comments,     setComments]     = useState<Comment[]>([]);
  const [activity,     setActivity]     = useState<Activity[]>([]);
  const [newComment,   setNewComment]   = useState('');
  const [loadingCmt,   setLoadingCmt]   = useState(false);
  const [loadingAct,   setLoadingAct]   = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [cmtError,     setCmtError]     = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  // ── Fetch comments ──────────────────────────────────────────────────────────
  const fetchComments = async () => {
    if (!task) return;
    setLoadingCmt(true);
    try {
      const res  = await fetch(`/api/tasks/comments?task_id=${task.id}`, { headers: authHeader });
      const data = await res.json();
      if (res.ok) setComments(data.comments ?? []);
    } finally {
      setLoadingCmt(false);
    }
  };

  // ── Fetch activity ──────────────────────────────────────────────────────────
  const fetchActivity = async () => {
    if (!task) return;
    setLoadingAct(true);
    try {
      const res  = await fetch(`/api/tasks/activity?task_id=${task.id}`, { headers: authHeader });
      const data = await res.json();
      if (res.ok) setActivity(data.activity ?? []);
    } finally {
      setLoadingAct(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !task) return;
    setActiveTab('details');
    setComments([]);
    setActivity([]);
    setNewComment('');
    fetchComments();
    fetchActivity();
  }, [isOpen, task?.id]);

  useEffect(() => {
    if (activeTab === 'comments') {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, activeTab]);

  // ── Submit comment ──────────────────────────────────────────────────────────
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;
    setSubmitting(true);
    setCmtError('');
    try {
      const res  = await fetch('/api/tasks/comments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body:    JSON.stringify({ task_id: task.id, comment: newComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComments(prev => [...prev, data.comment]);
      setNewComment('');
    } catch (err) {
      setCmtError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !task) return null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in-scale overflow-hidden">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${PRIORITY_STYLES[task.priority]}`}>
                  {task.priority}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[task.status]}`}>
                  {task.status.replace('_', ' ')}
                </span>
                {isOverdue && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400">
                    ⚠ Overdue
                  </span>
                )}
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white text-lg leading-snug truncate">
                {task.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 shrink-0">
            {(['details', 'comments', 'activity'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  'px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors -mb-px',
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                ].join(' ')}
              >
                {tab}
                {tab === 'comments' && comments.length > 0 && (
                  <span className="ml-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                    {comments.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Details Tab ── */}
            {activeTab === 'details' && (
              <div className="p-6 space-y-5">

                {/* Description */}
                {task.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">Description</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{task.description}</p>
                  </div>
                )}

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-4">
                  <MetaField label="Due Date">
                    <span className={isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
                      {task.due_date ? fmtDate(task.due_date) : '—'}
                    </span>
                  </MetaField>
                  <MetaField label="Start Date">
                    {task.start_date ? fmtDate(task.start_date) : '—'}
                  </MetaField>
                  <MetaField label="Estimated Hours">
                    {task.estimated_hours ? `${task.estimated_hours}h` : '—'}
                  </MetaField>
                  <MetaField label="Completed">
                    {task.completed_date ? fmtDate(task.completed_date) : '—'}
                  </MetaField>
                </div>

                {/* Assigned interns */}
                {task.interns && task.interns.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">Assigned Interns</p>
                    <div className="space-y-2">
                      {task.interns.map(intern => {
                        const done = task.intern_statuses?.[intern.id] === 'completed';
                        return (
                          <div key={intern.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={intern.name} size="xs" />
                              <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-none">{intern.name}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{intern.email}</p>
                              </div>
                            </div>
                            <span className={[
                              'text-xs font-medium px-2 py-0.5 rounded-full',
                              done
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
                            ].join(' ')}>
                              {done ? '✓ Done' : 'Pending'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {task.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {task.notes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">Admin Notes</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-800 leading-relaxed">
                      {task.notes}
                    </p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-600">
                  <span>Created {fmtRelative(task.created_at)}</span>
                  <span>Updated {fmtRelative(task.updated_at)}</span>
                </div>
              </div>
            )}

            {/* ── Comments Tab ── */}
            {activeTab === 'comments' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {loadingCmt ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-600">
                      <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No comments yet</p>
                      <p className="text-xs mt-1">Be the first to leave a comment</p>
                    </div>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <Avatar name={c.user.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.user.name}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">{fmtRelative(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3.5 py-2.5 border border-slate-100 dark:border-slate-800 leading-relaxed">
                            {c.comment}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Comment input */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  {cmtError && (
                    <p className="text-xs text-red-500 dark:text-red-400 mb-2">{cmtError}</p>
                  )}
                  <form onSubmit={handleSubmitComment} className="flex gap-3">
                    <input
                      type="text"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="flex-1 px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !newComment.trim()}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {submitting ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── Activity Tab ── */}
            {activeTab === 'activity' && (
              <div className="p-6">
                {loadingAct ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : activity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-600">
                    <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No activity yet</p>
                    <p className="text-xs mt-1">Changes to this task will appear here</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-3.5 top-2 bottom-2 w-px bg-slate-100 dark:bg-slate-800" />
                    <div className="space-y-5">
                      {activity.map(a => (
                        <div key={a.id} className="flex gap-4 relative">
                          {/* Dot */}
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center shrink-0 z-10">
                            <div className="w-2 h-2 rounded-full bg-primary-500" />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.user.name}</span>
                              <span className="text-xs text-slate-400 dark:text-slate-500">{fmtTime(a.created_at)}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 capitalize">
                              {a.action.replace(/_/g, ' ')}
                            </p>
                            {(a.old_value || a.new_value) && (
                              <div className="mt-1.5 flex items-center gap-2 text-xs">
                                {a.old_value && (
                                  <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full line-through">
                                    {a.old_value}
                                  </span>
                                )}
                                {a.old_value && a.new_value && (
                                  <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                                {a.new_value && (
                                  <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full">
                                    {a.new_value}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Helper ── */
const MetaField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{label}</p>
    <p className="text-sm text-slate-700 dark:text-slate-300">{children}</p>
  </div>
);

export default TaskDetailModal;