import React from 'react';

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'critical';
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const colorClasses = {
    low: 'bg-green-100 text-green-800 border border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    high: 'bg-orange-100 text-orange-800 border border-orange-300',
    critical: 'bg-red-100 text-red-800 border border-red-300',
  };

  const labels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };

  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${sizeClasses[size]} ${colorClasses[priority]}`}>
      {labels[priority]}
    </span>
  );
};

export default PriorityBadge;
