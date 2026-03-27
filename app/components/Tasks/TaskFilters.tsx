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
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({ filters, onFilterChange, interns = [] }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  const handleClear = () => {
    onFilterChange({
      search: '',
      status: '',
      priority: '',
      intern_id: '',
      date_range: 'all',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Search */}
        <input
          type="text"
          name="search"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />

        {/* Status */}
        <select
          name="status"
          value={filters.status}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Priority */}
        <select
          name="priority"
          value={filters.priority}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        {/* Date Range */}
        <select
          name="date_range"
          value={filters.date_range}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="overdue">Overdue</option>
        </select>

        {/* Clear Button */}
        <button
          onClick={handleClear}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition text-sm font-medium"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default TaskFilters;
