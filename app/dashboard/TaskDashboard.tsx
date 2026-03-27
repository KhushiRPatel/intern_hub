'use client';

import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/app/context/AuthContext';
import { useTaskContext, Task } from '@/app/context/TaskContext';
import TaskList from '@/app/components/Tasks/TaskList';
import TaskForm from '@/app/components/Tasks/TaskForm';
import TaskFilters, { TaskFilterOptions } from '@/app/components/Tasks/TaskFilters';

type TaskViewMode = 'list' | 'form' | 'details';

interface Department {
  id: string;
  name: string;
}

interface Intern {
  id: string;
  name: string;
  department_id: string;
}

export const TaskDashboard: React.FC = () => {
  const { user, token } = useAuthContext();
  const { tasks, setTasks, canEditTask, canDeleteTask, canChangeStatus, canCreateTask } = useTaskContext();

  const [viewMode, setViewMode] = useState<TaskViewMode>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilterOptions>({
    search: '',
    status: '',
    priority: '',
    intern_id: '',
    date_range: 'all',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);

  const getAuthHeader = () => ({
    Authorization: `Bearer ${token}`,
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchTasks = async () => {
    if (!user || !token) return;
    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks/get', {
        headers: getAuthHeader(),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
      
      if (data.success) {
        let filteredTasks = data.tasks;
        
        if (filters.search) {
          filteredTasks = filteredTasks.filter((task: Task) =>
            task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            (task.description && task.description.toLowerCase().includes(filters.search.toLowerCase()))
          );
        }
        if (filters.status) {
          filteredTasks = filteredTasks.filter((task: Task) => task.status === filters.status);
        }
        if (filters.priority) {
          filteredTasks = filteredTasks.filter((task: Task) => task.priority === filters.priority);
        }
        if (filters.intern_id) {
          filteredTasks = filteredTasks.filter((task: Task) => 
            task.intern_ids?.includes(filters.intern_id)
          );
        }
        if (filters.date_range !== 'all') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filteredTasks = filteredTasks.filter((task: Task) => {
            if (!task.due_date) return false;
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            switch (filters.date_range) {
              case 'today': return dueDate.getTime() === today.getTime();
              case 'week': {
                const weekEnd = new Date(today);
                weekEnd.setDate(weekEnd.getDate() + 7);
                return dueDate >= today && dueDate <= weekEnd;
              }
              case 'month': {
                const monthEnd = new Date(today);
                monthEnd.setDate(monthEnd.getDate() + 30);
                return dueDate >= today && dueDate <= monthEnd;
              }
              case 'overdue': return dueDate < today && task.status !== 'completed';
              default: return true;
            }
          });
        }
        setTasks(filteredTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showToast('Failed to load tasks', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchInterns = async () => {
    if (!user || !token || user.role === 'intern') return;
    try {
      const response = await fetch(
        user.role === 'admin' ? '/api/interns' : `/api/interns?department_id=${user.department_id}`,
        { headers: getAuthHeader() }
      );
      if (response.ok) {
        const data = await response.json();
        setInterns(Array.isArray(data) ? data : data.interns || []);
      }
    } catch (error) {
      console.error('Error fetching interns:', error);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchTasks();
      fetchDepartments();
      fetchInterns();
    }
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      fetchTasks();
    }
  }, [filters]);

  const handleCreateTask = async (formData: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ ...formData, assigned_by: user?.id }),
      });
      if (!response.ok) throw new Error('Failed to create task');
      showToast('Task created successfully', 'success');
      await fetchTasks();
      setViewMode('list');
      setSelectedTask(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error creating task', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTask = async (formData: any) => {
    if (!selectedTask) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/tasks/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ id: selectedTask.id, ...formData }),
      });
      if (!response.ok) throw new Error('Failed to update task');
      showToast('Task updated successfully', 'success');
      await fetchTasks();
      setViewMode('list');
      setSelectedTask(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error updating task', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/tasks/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      showToast('Task status updated', 'success');
      await fetchTasks();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error updating status', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const response = await fetch('/api/tasks/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ id: taskId }),
      });
      if (!response.ok) throw new Error('Failed to delete task');
      showToast('Task deleted', 'success');
      await fetchTasks();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error deleting task', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-white z-50 ${
            toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toastMessage.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        {canCreateTask && viewMode === 'list' && (
          <button
            onClick={() => { setSelectedTask(null); setViewMode('form'); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            disabled={isLoading}
          >
            + New Task
          </button>
        )}
      </div>

      {viewMode === 'form' ? (
        <div>
          <button
            onClick={() => { setViewMode('list'); setSelectedTask(null); }}
            className="mb-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back
          </button>
          <TaskForm
            interns={interns}
            departments={departments}
            onSubmit={selectedTask ? handleEditTask : handleCreateTask}
            onCancel={() => { setViewMode('list'); setSelectedTask(null); }}
            initialTask={selectedTask || undefined}
            isSubmitting={isLoading}
            isAdmin={user?.role === 'admin'}
          />
        </div>
      ) : (
        <>
          <TaskFilters filters={filters} onFilterChange={setFilters} interns={interns} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Open" value={tasks.filter(t => t.status === 'open').length} color="blue" />
            <StatCard label="In Progress" value={tasks.filter(t => t.status === 'in_progress').length} color="purple" />
            <StatCard label="Completed" value={tasks.filter(t => t.status === 'completed').length} color="green" />
            <StatCard label="Overdue" value={tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length} color="red" />
          </div>
          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            onEdit={(task) => { setSelectedTask(task); setViewMode('form'); }}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
            canEdit={canEditTask}
            canDelete={canDeleteTask}
            canChangeStatus={(task, newStatus) => canChangeStatus(task, newStatus)}
            showInternName={user?.role !== 'intern'}
          />
        </>
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'purple' | 'green' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
  };
  return (
    <div className={`${colors[color]} border rounded-lg p-4`}>
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};

export default TaskDashboard;
