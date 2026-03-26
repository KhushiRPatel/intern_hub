import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

export function Card({
  children,
  padding = 'md',
  hover = false,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'bg-white dark:bg-slate-900',
        'border border-slate-100 dark:border-slate-800',
        'rounded-2xl shadow-sm',
        hover
          ? 'hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200'
          : '',
        paddingMap[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  iconBg?: string;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ label, value, icon, iconBg = 'bg-primary-100 dark:bg-primary-900/30', trend, trendUp }: StatCardProps) {
  return (
    <Card padding="md" className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</p>
        {trend && (
          <p className={`text-xs font-medium mt-1 ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </p>
        )}
      </div>
    </Card>
  );
}
