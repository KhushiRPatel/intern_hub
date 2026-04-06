'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/context/AuthContext';
import { useAppDispatch, useUI } from '@/lib/hooks';
import { closeTaskDetailModal, openTaskDetailModal, openAddTaskModal, closeAddTaskModal, setTaskFilters, clearTaskFilters } from '@/lib/slices/uiSlice';
import { useTaskContext, Task } from '@/app/context/TaskContext';
import TaskList from '@/app/components/Tasks/TaskList';
import TaskForm from '@/app/components/Tasks/TaskForm';
import TaskFilters, { TaskFilterOptions } from '@/app/components/Tasks/TaskFilters';
import TaskDetailModal from '@/app/components/Tasks/TaskDetailModal';
import { useQuery } from '@apollo/client/react';
import { GET_DEPARTMENTS } from '@/graphql/queries';
import { Pagination } from '@/app/components/ui/Pagination';

interface Department { id: string; name: string; }
interface Intern     { id: string; name: string; department_id: string; }

const ITEMS_PER_PAGE = 9;

export const TaskDashboard: React.FC = () => {
  const { user, token } = useAuthContext();
  const dispatch = useAppDispatch();
  const { taskFilters, showTaskDetailModal, showAddTaskModal } = useUI();
  const { tasks, setTasks, canEditTask, canDeleteTask, canChangeStatus, canCreateTask } = useTaskContext();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailTask,   setDetailTask]   = useState<Task | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [toast,        setToast]        = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [interns,      setInterns]      = useState<Intern[]>([]);
  const [currentPage,  setCurrentPage]  = useState(1);

  // Track whether we've already handled the taskId param so we don't re-open on every re-render
  const handledTaskId = useRef<string | null>(null);

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
      if (taskFilters.search)
        list = list.filter(t =>
          t.title.toLowerCase().includes(taskFilters.search.toLowerCase()) ||
          t.description?.toLowerCase().includes(taskFilters.search.toLowerCase()),
        );
      if (taskFilters.status)    list = list.filter(t => t.status === taskFilters.status);
      if (taskFilters.priority)  list = list.filter(t => t.priority === taskFilters.priority);
      if (taskFilters.department) list = list.filter(t => t.department_id === taskFilters.department);
      if (taskFilters.search && taskFilters.priority && taskFilters.status && taskFilters.department) return true;
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
  useEffect(() => { fetchTasks(); }, [taskFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [taskFilters.search, taskFilters.status, taskFilters.priority, taskFilters.department]);

  // Auto-open task detail when navigated here via ?taskId=<id>
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (!taskId || tasks.length === 0) return;
    if (handledTaskId.current === taskId) return; // already handled
    const match = tasks.find(t => t.id === taskId);
    if (match) {
      handledTaskId.current = taskId;
      setDetailTask(match);
      dispatch(closeTaskDetailModal());
      // Clean the URL so refreshing doesn't re-open the modal
      router.replace('/dashboard/tasks', { scroll: false });
    }
  }, [tasks, searchParams, router]);

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
      dispatch(closeAddTaskModal());
      setSelectedTask(null);
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
      dispatch(closeAddTaskModal());
      setSelectedTask(null);
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

  const totalPages = Math.max(1, Math.ceil(tasks.length / ITEMS_PER_PAGE));
  const paginatedTasks = useMemo(
    () => tasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [tasks, currentPage],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tasks</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {isIntern
              ? 'Showing tasks assigned to you · You can mark tasks as completed'
              : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        {canCreateTask && !showAddTaskModal && (
          <button
            onClick={() => { setSelectedTask(null); dispatch(openAddTaskModal()); }}
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
      {showAddTaskModal && !isIntern ? (
        <div>
          <button
            onClick={() => { dispatch(closeAddTaskModal()); setSelectedTask(null); }}
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
            onCancel={() => { dispatch(closeAddTaskModal()); setSelectedTask(null); }}
            initialTask={selectedTask ?? undefined}
            isSubmitting={isLoading}
            isAdmin={user?.role === 'admin'}
            userRole={user?.role ?? 'intern'}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          <TaskFilters
            filters={{ search: taskFilters.search, status: taskFilters.status, priority: taskFilters.priority, intern_id: '', date_range: 'all' }}
            onFilterChange={(newFilters) => dispatch(setTaskFilters({ search: newFilters.search, status: newFilters.status, priority: newFilters.priority }))}
            interns={isIntern ? [] : interns}
            showInternFilter={!isIntern}
          />

          <TaskList
            tasks={paginatedTasks}
            isLoading={isLoading}
            onEdit={(task) => { setSelectedTask(task); dispatch(openAddTaskModal()); }}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onViewDetail={(task) => { setDetailTask(task); dispatch(openTaskDetailModal()); }}
            canEdit={canEditTask}
            canDelete={canDeleteTask}
            canChangeStatus={canChangeStatus}
            showInternName={!isIntern}
            userRole={user?.role ?? 'intern'}
          />

          <Pagination
            currentPage={currentPage}
            totalItems={tasks.length}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* ── Task Detail Modal ── */}
      <TaskDetailModal
        task={detailTask}
        isOpen={showTaskDetailModal}
        onClose={() => { dispatch(closeTaskDetailModal()); setDetailTask(null); }}
        token={token}
        userRole={user?.role ?? 'intern'}
      />
    </div>
  );
};

/* ── Stat Card ── */
interface StatCardProps { label: string; value: number; color: 'blue' | 'indigo' | 'green' | 'red'; }
const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => {
  const styles = {
    blue:   { wrap: 'bg-blue-50   dark:bg-blue-900/10   border-blue-100  dark:border-blue-900/30',   num: 'text-blue-600   dark:text-blue-400',   label: 'text-blue-500   dark:text-blue-500'   },
    indigo: { wrap: 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30', num: 'text-indigo-600 dark:text-indigo-400', label: 'text-indigo-500 dark:text-indigo-500' },
    green:  { wrap: 'bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30', num: 'text-primary-600 dark:text-primary-400', label: 'text-primary-500 dark:text-primary-500' },
    red:    { wrap: 'bg-red-50    dark:bg-red-900/10    border-red-100   dark:border-red-900/30',    num: 'text-red-600    dark:text-red-400',     label: 'text-red-500    dark:text-red-500'    },
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