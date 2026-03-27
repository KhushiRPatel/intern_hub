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

  // ── Departments via GraphQL (same as rest of app) ──────────────────────────
  const { data: deptData } = useQuery<{ departments: Department[] }>(GET_DEPARTMENTS);
  const departments = deptData?.departments ?? [];

  const authHeader = { Authorization: `Bearer ${token}` };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch tasks (server already scopes by role) ────────────────────────────
  const fetchTasks = async () => {
    if (!user || !token) return;
    setIsLoading(true);
    try {
      const res  = await fetch('/api/tasks/get', { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tasks');

      // Client-side filter on top of server-scoped results
      let list: Task[] = data.tasks;
      if (filters.search)
        list = list.filter(t =>
          t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          t.description?.toLowerCase().includes(filters.search.toLowerCase()),
        );
      if (filters.status)   list = list.filter(t => t.status === filters.status);
      if (filters.priority) list = list.filter(t => t.priority === filters.priority);
      if (filters.intern_id)
        list = list.filter(t => t.intern_ids?.includes(filters.intern_id));
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
    } catch (err) {
      showToast('Failed to load tasks', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fetch interns for task assignment (admin/dept only) ───────────────────
  // Interns never see this list — they can't assign tasks
  const fetchInterns = async () => {
    if (!user || !token || user.role === 'intern') return;
    try {
      const url = user.role === 'admin'
        ? '/api/interns'
        : `/api/interns?department_id=${user.department_id}`;
      const res  = await fetch(url, { headers: authHeader });
      if (!res.ok) return;
      const data = await res.json();
      setInterns(Array.isArray(data) ? data : data.interns ?? []);
    } catch { /* non-fatal */ }
  };

  useEffect(() => { fetchTasks(); fetchInterns(); }, [user, token]);
  useEffect(() => { fetchTasks(); }, [filters]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreateTask = async (formData: Partial<Task>) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ ...formData, assigned_by: user?.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      showToast('Task created');
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
      showToast('Task updated');
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

  return (
    <div className="space-y-6">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-white z-50 shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          {/* Role hint so interns know they are in read/complete-only mode */}
          {isIntern && (
            <p className="text-sm text-gray-500 mt-1">
              Showing tasks assigned to you · You can mark tasks as completed
            </p>
          )}
        </div>
        {/* Only admin / dept_person see "New Task" */}
        {canCreateTask && viewMode === 'list' && (
          <button
            onClick={() => { setSelectedTask(null); setViewMode('form'); }}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            + New Task
          </button>
        )}
      </div>

      {/* ── Form view (create / edit) — never shown to interns ── */}
      {viewMode === 'form' && !isIntern ? (
        <div>
          <button
            onClick={() => { setViewMode('list'); setSelectedTask(null); }}
            className="mb-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to list
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
          {/* ── Filters — hide intern filter for interns (they only see their own) ── */}
          <TaskFilters
            filters={filters}
            onFilterChange={setFilters}
            interns={isIntern ? [] : interns}   // hide intern dropdown for interns
            showInternFilter={!isIntern}
          />

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Open"        value={tasks.filter(t => t.status === 'open').length}        color="blue"   />
            <StatCard label="In Progress" value={tasks.filter(t => t.status === 'in_progress').length} color="purple" />
            <StatCard label="Completed"   value={tasks.filter(t => t.status === 'completed').length}   color="green"  />
            <StatCard label="Overdue"     value={tasks.filter(t =>
              t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
            ).length} color="red" />
          </div>

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

/* ── Stat card ── */
interface StatCardProps { label: string; value: number; color: 'blue'|'purple'|'green'|'red'; }
const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => {
  const c = { blue:'bg-blue-50 border-blue-200 text-blue-600', purple:'bg-purple-50 border-purple-200 text-purple-600', green:'bg-green-50 border-green-200 text-green-600', red:'bg-red-50 border-red-200 text-red-600' };
  return (
    <div className={`${c[color]} border rounded-xl p-4`}>
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};

export default TaskDashboard;