import { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'teal';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  warning: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  error:   'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  info:    'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  neutral: 'bg-slate-100  text-slate-600  dark:bg-slate-800     dark:text-slate-400',
  purple:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  teal:    'bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
  info:    'bg-blue-500',
  neutral: 'bg-slate-400',
  purple:  'bg-purple-500',
  teal:    'bg-teal-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs rounded-md',
  md: 'px-2.5 py-1 text-xs rounded-lg',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}

/* ── Convenience wrappers ───────────────────────────────────────────────────── */
export function StatusBadge({ status }: { status: 'active' | 'completed' | 'terminated' }) {
  const cfg: Record<string, { variant: BadgeVariant; label: string }> = {
    active:     { variant: 'success', label: 'Active' },
    completed:  { variant: 'info',    label: 'Completed' },
    terminated: { variant: 'error',   label: 'Terminated' },
  };
  const { variant, label } = cfg[status] ?? { variant: 'neutral' as BadgeVariant, label: status };
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function RoleBadge({ role }: { role: 'admin' | 'department_person' | 'intern' }) {
  const cfg: Record<string, { variant: BadgeVariant; label: string }> = {
    admin:             { variant: 'purple',  label: 'Admin' },
    department_person: { variant: 'info',    label: 'Dept. Person' },
    intern:            { variant: 'success', label: 'Intern' },
  };
  const { variant, label } = cfg[role] ?? { variant: 'neutral' as BadgeVariant, label: role };
  return <Badge variant={variant}>{label}</Badge>;
}

export function DeptBadge({ name }: { name: string }) {
  return <Badge variant="teal">{name}</Badge>;
}
