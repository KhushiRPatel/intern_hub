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
  intern_id?: string; // Deprecated: kept for backward compatibility
  intern_ids: string[]; // New: array of intern IDs
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthContext();

  // Permission checks based on role
  const canCreateTask = useCallback(() => {
    return user?.role === 'admin' || user?.role === 'department_person';
  }, [user]);

  const canEditTask = useCallback((task: Task) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'department_person' && task.department_id === user?.department_id) return true;
    if (user?.role === 'intern' && task.intern_ids?.includes(user?.intern_id)) return true;
    return false;
  }, [user]);

  const canDeleteTask = useCallback((task: Task) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'department_person' && task.department_id === user?.department_id) return true;
    return false;
  }, [user]);

  const canChangeStatus = useCallback((task: Task, newStatus: string) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'department_person' && task.department_id === user?.department_id) return true;
    // Interns can only mark as complete if assigned
    if (user?.role === 'intern' && task.intern_ids?.includes(user?.intern_id) && newStatus === 'completed') return true;
    return false;
  }, [user]);

  const addTask = useCallback((task: Task) => {
    setTasks((prev) => [task, ...prev]);
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  const value: TaskContextType = {
    tasks,
    isLoading,
    error,
    canCreateTask: canCreateTask(),
    canEditTask,
    canDeleteTask,
    canChangeStatus,
    setTasks,
    addTask,
    updateTask,
    deleteTask,
    setLoading,
    setError,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within TaskProvider');
  }
  return context;
};
