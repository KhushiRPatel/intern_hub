'use client';

import React from 'react';

export interface TaskFilterOptions {
  search: string;
  status: string;
  priority: string;
  intern_id: string;
  date_range: 'all' | 'today' | 'week' | 'month' | 'overdue';
}

interface TaskFiltersProps {
  filters: TaskFilterOptions;
  onFilterChange: (filters: TaskFilterOptions) => void;
  interns?: Array<{ id: string; name: string }>;
  showInternFilter?: boolean;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onFilterChange,
  interns = [],
  showInternFilter = true,
}) => {
  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onFilterChange({ ...filters, [e.target.name]: e.target.value });

  const clear = () =>
    onFilterChange({ search: '', status: '', priority: '', intern_id: '', date_range: 'all' });

  const hasFilter =
    filters.search || filters.status || filters.priority ||
    filters.intern_id || filters.date_range !== 'all';

  const selectCls = [
    'px-3 py-2.5 rounded-xl text-sm transition-colors',
    'border border-slate-200 dark:border-slate-700',
    'bg-white dark:bg-slate-800/60',
    'text-slate-700 dark:text-slate-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400',
  ].join(' ');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
      <div className={`grid gap-3 ${showInternFilter ? 'grid-cols-1 md:grid-cols-5' : 'grid-cols-1 md:grid-cols-4'}`}>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            type="text"
            name="search"
            placeholder="Search tasks…"
            value={filters.search}
            onChange={set}
            className={`${selectCls} w-full pl-9`}
          />
        </div>

        {/* Status */}
        <select name="status" value={filters.status} onChange={set} className={selectCls}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Priority */}
        <select name="priority" value={filters.priority} onChange={set} className={selectCls}>
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        {/* Date range */}
        <select name="date_range" value={filters.date_range} onChange={set} className={selectCls}>
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="overdue">Overdue</option>
        </select>

        {/* Intern filter */}
        {showInternFilter && (
          <select name="intern_id" value={filters.intern_id} onChange={set} className={selectCls}>
            <option value="">All Interns</option>
            {interns.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Active chips */}
      {hasFilter && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 dark:text-slate-500">Active:</span>
          {filters.search     && <Chip label={`"${filters.search}"`} />}
          {filters.status     && <Chip label={filters.status.replace('_', ' ')} />}
          {filters.priority   && <Chip label={filters.priority} />}
          {filters.date_range !== 'all' && <Chip label={filters.date_range} />}
          {filters.intern_id  && <Chip label="intern filter" />}
          <button
            onClick={clear}
            className="ml-auto text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

const Chip: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-medium px-2.5 py-0.5 rounded-full capitalize border border-primary-100 dark:border-primary-800/40">
    {label}
  </span>
);

export default TaskFilters;