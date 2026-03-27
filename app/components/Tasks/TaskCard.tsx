'use client';

import React from 'react';
import { Task } from '@/app/context/TaskContext';
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
}

const formatRelativeTime = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit = false,
  canDelete = false,
  canChangeStatus = false,
  showInternName = false,
}) => {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div className={`border rounded-lg p-4 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'} bg-white hover:shadow-md transition`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">{task.title}</h3>
          {showInternName && task.interns && task.interns.length > 0 && (
            <p className="text-sm text-gray-600">Assigned to: {task.interns.map(i => i.name).join(', ')}</p>
          )}
        </div>
        <PriorityBadge priority={task.priority} size="sm" />
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-gray-700 text-sm mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <span className="text-gray-600">Due:</span>
          <span className={`ml-1 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Status:</span>
          <div className="ml-1 inline-block">
            <StatusBadge status={task.status as any} size="sm" />
          </div>
        </div>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
        <span className="text-xs text-gray-500">
          Created {formatRelativeTime(task.created_at)}
        </span>
        <div className="flex gap-2">
          {canChangeStatus && task.status !== 'completed' && (
            <button
              onClick={() => onStatusChange?.(task.id, 'completed')}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded transition"
            >
              Complete
            </button>
          )}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition"
            >
              Edit
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition"
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
