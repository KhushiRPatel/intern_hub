'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuthContext } from './AuthContext';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  due_date?: string;
  start_date?: string;
  completed_date?: string;
  estimated_hours?: number;
  intern_id?: string;   // deprecated, kept for backward compat
  intern_ids: string[]; // canonical: array of interns.id values
  assigned_by: string;
  assigned_to?: string;
  department_id: string;
  parent_task_id?: string;
  tags?: string[];
  attachment_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  interns?: Array<{ id: string; name: string; email: string }>;
  // Per-intern completion — only present when fetched as an intern
  my_intern_status?: 'pending' | 'completed';
  // Map of intern_id → intern_status (for admin/dept view)
  intern_statuses?: Record<string, string>;
}

export interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;

  // Permissions
  canCreateTask: boolean;
  canEditTask: (task: Task) => boolean;
  canDeleteTask: (task: Task) => boolean;
  canChangeStatus: (task: Task, newStatus: string) => boolean;

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const { user }              = useAuthContext();

  // ── canCreateTask ──────────────────────────────────────────────────────────
  // Admin and dept_person only
  const canCreateTask = user?.role === 'admin' || user?.role === 'department_person';

  // ── canEditTask ────────────────────────────────────────────────────────────
  // Admin: any task
  // Dept person: tasks in their department
  // Intern: NO field editing (status-only via canChangeStatus)
  const canEditTask = useCallback((task: Task): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'department_person') return task.department_id === user.department_id;
    return false; // interns cannot edit task fields
  }, [user]);

  // ── canDeleteTask ──────────────────────────────────────────────────────────
  // Admin: any task
  // Dept person: tasks in their department
  // Intern: never
  const canDeleteTask = useCallback((task: Task): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'department_person') return task.department_id === user.department_id;
    return false;
  }, [user]);

  // ── canChangeStatus ────────────────────────────────────────────────────────
  // Admin: any task, any status
  // Dept person: tasks in their department, any status
  // Intern: only tasks assigned to them (intern_ids includes their intern_id),
  //         and only to 'completed'
  const canChangeStatus = useCallback((task: Task, newStatus: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'department_person') return task.department_id === user.department_id;
    if (user.role === 'intern') {
      // FIX: user.intern_id is the interns.id, which is what task_interns stores
      const assignedToMe = user.intern_id
        ? task.intern_ids?.includes(user.intern_id)
        : false;
      return assignedToMe && newStatus === 'completed';
    }
    return false;
  }, [user]);

  const addTask = useCallback((task: Task) => {
    setTasks(prev => [task, ...prev]);
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  return (
    <TaskContext.Provider value={{
      tasks, isLoading, error,
      canCreateTask,
      canEditTask,
      canDeleteTask,
      canChangeStatus,
      setTasks, addTask, updateTask, deleteTask, setLoading, setError,
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider');
  return ctx;
};