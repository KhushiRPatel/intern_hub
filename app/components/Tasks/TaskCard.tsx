'use client';

import React, { useState } from 'react';
import { Task } from '@/app/context/TaskContext';
import { UserRole } from '@/lib/constants';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canChangeStatus?: boolean;
  showInternName?: boolean;
  userRole?: UserRole;
}

const ALL_STATUSES = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;

const fmtRelative = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(date).toLocaleDateString();
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit         = false,
  canDelete       = false,
  canChangeStatus = false,
  showInternName  = false,
  userRole        = 'intern',
}) => {
  const [statusOpen, setStatusOpen] = useState(false);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const isIntern  = userRole === 'intern';

  return (
    <div className={[
      'relative flex flex-col rounded-2xl border transition-all duration-150',
      'bg-white dark:bg-slate-900',
      'hover:shadow-md hover:-translate-y-0.5',
      'group',
      isOverdue
        ? 'border-red-200 dark:border-red-800/60'
        : 'border-slate-100 dark:border-slate-800',
    ].join(' ')}>

      {/* Overdue strip */}
      {isOverdue && (
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-red-400 to-red-500" />
      )}

      <div className="p-4 flex flex-col flex-1 gap-3">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug truncate">
              {task.title}
            </h3>
            {showInternName && task.interns && task.interns.length > 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                {task.interns.map(i => i.name).join(', ')}
              </p>
            )}
          </div>
          <PriorityBadge priority={task.priority} size="sm" />
        </div>

        {/* ── Description ── */}
        {task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* ── Status + Due date row ── */}
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={task.status as any} size="sm" />
          <span className={[
            'text-xs font-medium',
            isOverdue
              ? 'text-red-500 dark:text-red-400'
              : 'text-slate-400 dark:text-slate-500',
          ].join(' ')}>
            {task.due_date
              ? (isOverdue ? '⚠ ' : '') + new Date(task.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
              : 'No due date'}
          </span>
        </div>

        {/* ── Per-intern completion chips (admin/dept) ── */}
        {!isIntern && task.interns && task.interns.length > 0 && task.intern_statuses && (
          <div className="flex flex-wrap gap-1">
            {task.interns.map(intern => {
              const done = task.intern_statuses?.[intern.id] === 'completed';
              return (
                <span key={intern.id} className={[
                  'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium',
                  done
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-800/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                ].join(' ')}>
                  {done ? '✓' : '○'} {intern.name}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Tags ── */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer / Actions ── */}
      <div className="px-4 py-3 border-t border-slate-50 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-300 dark:text-slate-600">
          {fmtRelative(task.created_at)}
        </span>

        <div className="flex gap-1.5 items-center">

          {/* Intern: mark complete */}
          {isIntern && canChangeStatus && task.my_intern_status !== 'completed' && (
            <button
              onClick={() => onStatusChange?.(task.id, 'completed')}
              className="px-2.5 py-1 text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-lg transition font-medium border border-primary-100 dark:border-primary-800/40"
            >
              ✓ Mark Complete
            </button>
          )}
          {isIntern && task.my_intern_status === 'completed' && (
            <span className="px-2.5 py-1 text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg font-medium border border-primary-100 dark:border-primary-800/40">
              ✓ Done
            </span>
          )}

          {/* Admin/dept: status dropdown */}
          {!isIntern && canChangeStatus && (
            <div className="relative">
              <button
                onClick={() => setStatusOpen(v => !v)}
                className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition font-medium"
              >
                Status ▾
              </button>
              {statusOpen && (
                <div className="absolute right-0 bottom-8 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg min-w-[140px] py-1 text-sm overflow-hidden">
                  {ALL_STATUSES.filter(s => s !== task.status).map(s => (
                    <button
                      key={s}
                      onClick={() => { onStatusChange?.(task.id, s); setStatusOpen(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 capitalize text-slate-700 dark:text-slate-300 transition text-xs"
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Edit */}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 dark:hover:text-primary-400 transition-colors"
              title="Edit"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {/* Delete */}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;