import React from 'react';

interface StatusBadgeProps {
  status: 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const colorClasses = {
    open: 'bg-blue-100 text-blue-800 border border-blue-300',
    in_progress: 'bg-purple-100 text-purple-800 border border-purple-300',
    completed: 'bg-green-100 text-green-800 border border-green-300',
    on_hold: 'bg-gray-100 text-gray-800 border border-gray-300',
    cancelled: 'bg-red-100 text-red-800 border border-red-300',
  };

  const labels = {
    open: 'Open',
    in_progress: 'In Progress',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
  };

  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${sizeClasses[size]} ${colorClasses[status]}`}>
      {labels[status]}
    </span>
  );
};

export default StatusBadge;
