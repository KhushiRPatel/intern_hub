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
  showInternFilter?: boolean; // false for interns — they only see their own tasks
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

  const hasFilter = filters.search || filters.status || filters.priority ||
                    filters.intern_id || filters.date_range !== 'all';

  const selectCls = 'px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200';
  const inputCls  = `${selectCls} w-full`;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
      <div className={`grid gap-3 ${showInternFilter ? 'grid-cols-1 md:grid-cols-5' : 'grid-cols-1 md:grid-cols-4'}`}>

        {/* Search */}
        <input
          type="text"
          name="search"
          placeholder="Search tasks…"
          value={filters.search}
          onChange={set}
          className={inputCls}
        />

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

        {/* Intern filter — hidden for interns */}
        {showInternFilter && (
          <select name="intern_id" value={filters.intern_id} onChange={set} className={selectCls}>
            <option value="">All Interns</option>
            {interns.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Active filter chips + clear */}
      {hasFilter && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Active:</span>
          {filters.search    && <Chip label={`"${filters.search}"`} />}
          {filters.status    && <Chip label={filters.status.replace('_', ' ')} />}
          {filters.priority  && <Chip label={filters.priority} />}
          {filters.date_range !== 'all' && <Chip label={filters.date_range} />}
          {filters.intern_id && <Chip label="intern filter" />}
          <button onClick={clear} className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

const Chip: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full capitalize">
    {label}
  </span>
);

export default TaskFilters;