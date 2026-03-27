'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/app/context/TaskContext';

interface TaskFormProps {
  interns?: Array<{ id: string; name: string; department_id: string }>;
  departments?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; name: string }>;
  onSubmit: (taskData: Partial<Task>) => void;
  onCancel?: () => void;
  initialTask?: Task;
  isSubmitting?: boolean;
  isAdmin?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  interns = [],
  departments = [],
  users = [],
  onSubmit,
  onCancel,
  initialTask,
  isSubmitting = false,
  isAdmin = false,
}) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    intern_ids: [],
    department_id: '',
    assigned_to: '',
    due_date: '',
    start_date: new Date().toISOString().split('T')[0],
    estimated_hours: 0,
    tags: [],
    notes: '',
    ...initialTask,
  });

  const [tagsInput, setTagsInput] = useState<string>(initialTask?.tags?.join(', ') || '');

  useEffect(() => {
    if (initialTask) {
      setFormData(initialTask);
      setTagsInput(initialTask.tags?.join(', ') || '');
    }
  }, [initialTask]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInternChange = (internId: string) => {
    setFormData((prev) => {
      const currentIds = prev.intern_ids || [];
      const updatedIds = currentIds.includes(internId)
        ? currentIds.filter((id) => id !== internId)
        : [...currentIds, internId];
      
      // Set department_id from first selected intern
      const firstIntern = interns.find((i) => i.id === updatedIds[0]);
      return {
        ...prev,
        intern_ids: updatedIds,
        department_id: firstIntern?.department_id || prev.department_id,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.intern_ids || formData.intern_ids.length === 0) {
      alert('Please select at least one intern');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    onSubmit({
      ...formData,
      tags,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title || ''}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task title"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task description"
          />
        </div>

        {/* Interns */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Interns *</label>
          <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
            {interns.length > 0 ? (
              <div className="space-y-2">
                {interns.map((intern) => (
                  <label key={intern.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(formData.intern_ids || []).includes(intern.id)}
                      onChange={() => handleInternChange(intern.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{intern.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No interns available</p>
            )}
          </div>
          {(!formData.intern_ids || formData.intern_ids.length === 0) && (
            <p className="mt-1 text-sm text-red-500">Please select at least one intern</p>
          )}
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
          <select
            name="department_id"
            value={formData.department_id || ''}
            onChange={handleInputChange}
            required
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 cursor-not-allowed"
          >
            <option value="">Auto-filled from intern</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            name="priority"
            value={formData.priority || 'medium'}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status || 'open'}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Estimated Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
          <input
            type="number"
            name="estimated_hours"
            value={formData.estimated_hours || ''}
            onChange={handleInputChange}
            step="0.5"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tags */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. urgent, backend, testing"
          />
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Internal notes"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : initialTask ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;
