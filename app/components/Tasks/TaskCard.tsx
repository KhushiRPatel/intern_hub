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
  canChangeStatus?: boolean; // true = may change status (role-gated upstream)
  showInternName?: boolean;
  userRole?: UserRole;
}

// All statuses admin/dept_person can cycle through
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
    <div className={`relative border rounded-xl p-4 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow ${
      isOverdue ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-slate-700'
    }`}>

      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-tight truncate">
            {task.title}
          </h3>
          {showInternName && task.interns && task.interns.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Assigned to: {task.interns.map(i => i.name).join(', ')}
            </p>
          )}
        </div>
        <PriorityBadge priority={task.priority} size="sm" />
      </div>

      {/* ── Description ── */}
      {task.description && (
        <p className="text-gray-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* ── Meta ── */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <span className="text-gray-500 dark:text-slate-500">Due:</span>
          <span className={`ml-1 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-800 dark:text-slate-200'}`}>
            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 dark:text-slate-500">Status:</span>
          <StatusBadge status={task.status as any} size="sm" />
        </div>
      </div>

      {/* ── Per-intern completion (admin/dept view) ── */}
      {!isIntern && task.interns && task.interns.length > 0 && task.intern_statuses && (
        <div className="mb-3 flex flex-wrap gap-1">
          {task.interns.map(intern => {
            const done = task.intern_statuses?.[intern.id] === 'completed';
            return (
              <span key={intern.id} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${
                done
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
              }`}>
                {done ? '✓' : '○'} {intern.name}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Tags ── */}
      {task.tags && task.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {task.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
        <span className="text-xs text-gray-400 dark:text-slate-500">
          {fmtRelative(task.created_at)}
        </span>

        <div className="flex gap-1.5 items-center">

          {/* INTERN: single "Mark Complete" button — driven by their own intern_status */}
          {isIntern && canChangeStatus && task.my_intern_status !== 'completed' && (
            <button
              onClick={() => onStatusChange?.(task.id, 'completed')}
              className="px-2.5 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 rounded-lg transition font-medium"
            >
              ✓ Mark Complete
            </button>
          )}
          {isIntern && task.my_intern_status === 'completed' && (
            <span className="px-2.5 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 rounded-lg font-medium border border-green-200 dark:border-green-800">
              ✓ Completed by you
            </span>
          )}

          {/* ADMIN / DEPT: status dropdown — all statuses */}
          {!isIntern && canChangeStatus && (
            <div className="relative">
              <button
                onClick={() => setStatusOpen(v => !v)}
                className="px-2.5 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 rounded-lg transition font-medium"
              >
                Status ▾
              </button>
              {statusOpen && (
                <div className="absolute right-0 bottom-8 z-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg min-w-[130px] py-1 text-sm">
                  {ALL_STATUSES.filter(s => s !== task.status).map(s => (
                    <button
                      key={s}
                      onClick={() => { onStatusChange?.(task.id, s); setStatusOpen(false); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 capitalize text-gray-700 dark:text-slate-300 transition"
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Edit — admin/dept only */}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="px-2.5 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 rounded-lg transition font-medium"
            >
              Edit
            </button>
          )}

          {/* Delete — admin/dept only */}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="px-2.5 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 rounded-lg transition font-medium"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;