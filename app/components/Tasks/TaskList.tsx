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
  canEdit        = () => false,
  canDelete      = () => false,
  canChangeStatus = () => false,
  showInternName = false,
  userRole       = 'intern',
  emptyMessage   = 'No tasks found',
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-gray-500 font-medium">{emptyMessage}</p>
        {userRole === 'intern' && (
          <p className="text-sm text-gray-400 mt-1">Tasks assigned to you will appear here</p>
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
          // For status change, pass the next logical status — 'completed' for interns
          // For admin/dept we pass task.status as placeholder (TaskCard shows a dropdown)
          canChangeStatus={canChangeStatus(task, 'completed')}
          showInternName={showInternName}
          userRole={userRole}
        />
      ))}
    </div>
  );
};

export default TaskList;