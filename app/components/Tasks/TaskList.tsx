'use client';

import React from 'react';
import { Task } from '@/app/context/TaskContext';
import { UserRole } from '@/lib/constants';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  canEdit?: (task: Task) => boolean;
  canDelete?: (task: Task) => boolean;
  canChangeStatus?: (task: Task, newStatus: string) => boolean;
  showInternName?: boolean;
  userRole?: UserRole;
  emptyMessage?: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  isLoading = false,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit         = () => false,
  canDelete       = () => false,
  canChangeStatus = () => false,
  showInternName  = false,
  userRole        = 'intern',
  emptyMessage    = 'No tasks found',
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="skeleton h-4 w-3/4 rounded-lg" />
            <div className="skeleton h-3 w-full rounded-lg" />
            <div className="skeleton h-3 w-2/3 rounded-lg" />
            <div className="flex gap-2 pt-2">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="font-semibold text-slate-600 dark:text-slate-400">{emptyMessage}</p>
        {userRole === 'intern' && (
          <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">Tasks assigned to you will appear here</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          canEdit={canEdit(task)}
          canDelete={canDelete(task)}
          canChangeStatus={canChangeStatus(task, 'completed')}
          showInternName={showInternName}
          userRole={userRole}
        />
      ))}
    </div>
  );
};

export default TaskList;