'use client';

import React from 'react';
import { Task } from '@/app/context/TaskContext';
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
  emptyMessage?: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  isLoading = false,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit = () => false,
  canDelete = () => false,
  canChangeStatus = () => false,
  showInternName = false,
  emptyMessage = 'No tasks found',
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin">
          <div className="border-t-4 border-b-4 border-blue-500 rounded-full h-12 w-12"></div>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          canEdit={canEdit(task)}
          canDelete={canDelete(task)}
          canChangeStatus={canChangeStatus(task, task.status)}
          showInternName={showInternName}
        />
      ))}
    </div>
  );
};

export default TaskList;
