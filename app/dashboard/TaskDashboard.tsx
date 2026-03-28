'use client';

import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/app/context/AuthContext';
import { useTaskContext, Task } from '@/app/context/TaskContext';
import TaskList from '@/app/components/Tasks/TaskList';
import TaskForm from '@/app/components/Tasks/TaskForm';
import TaskFilters, { TaskFilterOptions } from '@/app/components/Tasks/TaskFilters';
import { useQuery } from '@apollo/client/react';
import { GET_DEPARTMENTS } from '@/graphql/queries';

type TaskViewMode = 'list' | 'form';
interface Department { id: string; name: string; }
interface Intern     { id: string; name: string; department_id: string; }

export const TaskDashboard: React.FC = () => {
  const { user, token } = useAuthContext();
  const { tasks, setTasks, canEditTask, canDeleteTask, canChangeStatus, canCreateTask } = useTaskContext();

  const [viewMode,     setViewMode]     = useState<TaskViewMode>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters,      setFilters]      = useState<TaskFilterOptions>({
    search: '', status: '', priority: '', intern_id: '', date_range: 'all',
  });
  const [isLoading,    setIsLoading]    = useState(false);
  const [toast,        setToast]        = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [interns,      setInterns]      = useState<Intern[]>([]);

  const { data: deptData } = useQuery<{ departments: Department[] }>(GET_DEPARTMENTS);
  const departments = deptData?.departments ?? [];
  const authHeader  = { Authorization: `Bearer ${token}` };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTasks = async () => {
    if (!user || !token) return;
    setIsLoading(true);
    try {
      const res  = await fetch('/api/tasks/get', { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tasks');

      let list: Task[] = data.tasks;
      if (filters.search)
        list = list.filter(t =>
          t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          t.description?.toLowerCase().includes(filters.search.toLowerCase()),
        );
      if (filters.status)    list = list.filter(t => t.status === filters.status);
      if (filters.priority)  list = list.filter(t => t.priority === filters.priority);
      if (filters.intern_id) list = list.filter(t => t.intern_ids?.includes(filters.intern_id));
      if (filters.date_range !== 'all') {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        list = list.filter(t => {
          if (!t.due_date) return false;
          const due = new Date(t.due_date); due.setHours(0, 0, 0, 0);
          switch (filters.date_range) {
            case 'today':   return due.getTime() === today.getTime();
            case 'week':    { const e = new Date(today); e.setDate(e.getDate() + 7);  return due >= today && due <= e; }
            case 'month':   { const e = new Date(today); e.setDate(e.getDate() + 30); return due >= today && due <= e; }
            case 'overdue': return due < today && t.status !== 'completed';
            default:        return true;
          }
        });
      }
      setTasks(list);
    } catch {
      showToast('Failed to load tasks', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInterns = async () => {
    if (!user || !token || user.role === 'intern') return;
    try {
      const url  = user.role === 'admin' ? '/api/interns' : `/api/interns?department_id=${user.department_id}`;
      const res  = await fetch(url, { headers: authHeader });
      if (!res.ok) return;
      const data = await res.json();
      setInterns(Array.isArray(data) ? data : data.interns ?? []);
    } catch { /* non-fatal */ }
  };

  useEffect(() => { fetchTasks(); fetchInterns(); }, [user, token]);
  useEffect(() => { fetchTasks(); }, [filters]);

  const handleCreateTask = async (formData: Partial<Task>) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ ...formData, assigned_by: user?.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Task created successfully');
      await fetchTasks();
      setViewMode('list'); setSelectedTask(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error creating task', 'error');
    } finally { setIsLoading(false); }
  };

  const handleEditTask = async (formData: Partial<Task>) => {
    if (!selectedTask) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ id: selectedTask.id, ...formData }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Task updated successfully');
      await fetchTasks();
      setViewMode('list'); setSelectedTask(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error updating task', 'error');
    } finally { setIsLoading(false); }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/tasks/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Status updated');
      await fetchTasks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error updating status', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch('/api/tasks/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ id: taskId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Task deleted');
      await fetchTasks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error deleting task', 'error');
    }
  };

  const isIntern = user?.role === 'intern';

  const stats = [
    { label: 'Open',        value: tasks.filter(t => t.status === 'open').length,        color: 'blue'   as const },
    { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'indigo' as const },
    { label: 'Completed',   value: tasks.filter(t => t.status === 'completed').length,   color: 'green'  as const },
    { label: 'Overdue',     value: tasks.filter(t =>
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).length, color: 'red' as const },
  ];

  return (
    <div className="space-y-6">

      {/* ── Toast ── */}
      {toast && (
        <div className={[
          'fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white',
          'animate-slide-in-right',
          toast.type === 'success'
            ? 'bg-primary-600'
            : 'bg-red-500',
        ].join(' ')}>
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tasks</h1>
          {isIntern ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
              Showing tasks assigned to you · You can mark tasks as completed
            </p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
            </p>
          )}
        </div>

        {canCreateTask && viewMode === 'list' && (
          <button
            onClick={() => { setSelectedTask(null); setViewMode('form'); }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-200 dark:shadow-primary-900/30 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        )}
      </div>

      {/* ── Form view ── */}
      {viewMode === 'form' && !isIntern ? (
        <div>
          <button
            onClick={() => { setViewMode('list'); setSelectedTask(null); }}
            className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to list
          </button>
          <TaskForm
            interns={interns}
            departments={departments}
            onSubmit={selectedTask ? handleEditTask : handleCreateTask}
            onCancel={() => { setViewMode('list'); setSelectedTask(null); }}
            initialTask={selectedTask ?? undefined}
            isSubmitting={isLoading}
            isAdmin={user?.role === 'admin'}
            userRole={user?.role ?? 'intern'}
          />
        </div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* ── Filters ── */}
          <TaskFilters
            filters={filters}
            onFilterChange={setFilters}
            interns={isIntern ? [] : interns}
            showInternFilter={!isIntern}
          />

          {/* ── Task list ── */}
          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            onEdit={(task) => { setSelectedTask(task); setViewMode('form'); }}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
            canEdit={canEditTask}
            canDelete={canDeleteTask}
            canChangeStatus={canChangeStatus}
            showInternName={!isIntern}
            userRole={user?.role ?? 'intern'}
          />
        </>
      )}
    </div>
  );
};

/* ── Stat Card ── */
interface StatCardProps { label: string; value: number; color: 'blue' | 'indigo' | 'green' | 'red'; }

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => {
  const styles = {
    blue:   { wrap: 'bg-blue-50   dark:bg-blue-900/10   border-blue-100  dark:border-blue-900/30',  num: 'text-blue-600   dark:text-blue-400',   label: 'text-blue-500   dark:text-blue-500'   },
    indigo: { wrap: 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30', num: 'text-indigo-600 dark:text-indigo-400', label: 'text-indigo-500 dark:text-indigo-500' },
    green:  { wrap: 'bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30', num: 'text-primary-600 dark:text-primary-400', label: 'text-primary-500 dark:text-primary-500' },
    red:    { wrap: 'bg-red-50    dark:bg-red-900/10    border-red-100   dark:border-red-900/30',   num: 'text-red-600    dark:text-red-400',     label: 'text-red-500    dark:text-red-500'    },
  };
  const s = styles[color];
  return (
    <div className={`${s.wrap} border rounded-2xl p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${s.label}`}>{label}</p>
      <p className={`text-3xl font-bold ${s.num}`}>{value}</p>
    </div>
  );
};

export default TaskDashboard;