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
  userRole?: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  interns = [],
  departments = [],
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
    due_date: '',
    start_date: new Date().toISOString().split('T')[0],
    estimated_hours: 0,
    tags: [],
    notes: '',
    ...initialTask,
  });

  const [tagsInput, setTagsInput] = useState(initialTask?.tags?.join(', ') || '');

  useEffect(() => {
    if (initialTask) {
      setFormData(initialTask);
      setTagsInput(initialTask.tags?.join(', ') || '');
    }
  }, [initialTask]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInternToggle = (internId: string) => {
    setFormData(prev => {
      const current = prev.intern_ids || [];
      const updated = current.includes(internId)
        ? current.filter(id => id !== internId)
        : [...current, internId];
      const firstIntern = interns.find(i => i.id === updated[0]);
      return { ...prev, intern_ids: updated, department_id: firstIntern?.department_id || prev.department_id };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.intern_ids || formData.intern_ids.length === 0) {
      alert('Please select at least one intern');
      return;
    }
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    onSubmit({ ...formData, tags });
  };

  const inputCls = [
    'w-full px-3.5 py-2.5 rounded-xl text-sm transition-colors',
    'border border-slate-200 dark:border-slate-700',
    'bg-white dark:bg-slate-800/60',
    'text-slate-800 dark:text-slate-100',
    'placeholder-slate-400 dark:placeholder-slate-500',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 dark:focus:border-primary-500',
  ].join(' ');

  const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5';

  const selectedDept = departments.find(d => d.id === formData.department_id);

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

      {/* Form header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">
          {initialTask ? 'Edit Task' : 'New Task'}
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {initialTask ? 'Update the task details below' : 'Fill in the details to create a new task'}
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Title */}
          <div className="md:col-span-2">
            <label className={labelCls}>Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              name="title"
              value={formData.title || ''}
              onChange={handleChange}
              required
              placeholder="Enter task title"
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              placeholder="What needs to be done?"
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Assign Interns */}
          <div className="md:col-span-2">
            <label className={labelCls}>
              Assign to Interns <span className="text-red-400">*</span>
              {formData.intern_ids && formData.intern_ids.length > 0 && (
                <span className="ml-2 normal-case font-medium text-primary-600 dark:text-primary-400">
                  {formData.intern_ids.length} selected
                </span>
              )}
            </label>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {interns.length > 0 ? (
                <div className="max-h-44 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                  {interns.map(intern => {
                    const checked = (formData.intern_ids || []).includes(intern.id);
                    return (
                      <label
                        key={intern.id}
                        className={[
                          'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                          checked
                            ? 'bg-primary-50 dark:bg-primary-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleInternToggle(intern.id)}
                          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className={`text-sm ${checked ? 'text-primary-700 dark:text-primary-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                          {intern.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 px-4 py-3">No interns available</p>
              )}
            </div>
            {(!formData.intern_ids || formData.intern_ids.length === 0) && (
              <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">Please select at least one intern</p>
            )}
          </div>

          {/* Department (auto-filled) */}
          <div>
            <label className={labelCls}>Department</label>
            <div className={`${inputCls} flex items-center gap-2 cursor-not-allowed opacity-70`}>
              {selectedDept ? (
                <span className="inline-block bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {selectedDept.name}
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 text-xs">Auto-filled from intern</span>
              )}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className={labelCls}>Priority</label>
            <select name="priority" value={formData.priority || 'medium'} onChange={handleChange} className={inputCls}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>Status</label>
            <select name="status" value={formData.status || 'open'} onChange={handleChange} className={inputCls}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" name="start_date" value={formData.start_date || ''} onChange={handleChange} className={inputCls} />
          </div>

          {/* Due Date */}
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" name="due_date" value={formData.due_date || ''} onChange={handleChange} className={inputCls} />
          </div>

          {/* Estimated Hours */}
          <div>
            <label className={labelCls}>Estimated Hours</label>
            <input
              type="number"
              name="estimated_hours"
              value={formData.estimated_hours || ''}
              onChange={handleChange}
              step="0.5"
              min="0"
              placeholder="0"
              className={inputCls}
            />
          </div>

          {/* Tags */}
          <div className="md:col-span-2">
            <label className={labelCls}>Tags <span className="normal-case font-normal text-slate-400">(comma-separated)</span></label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="e.g. urgent, backend, testing"
              className={inputCls}
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className={labelCls}>Admin Notes</label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={2}
              placeholder="Internal notes (not visible to interns)"
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-200 dark:shadow-primary-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </span>
          ) : initialTask ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;