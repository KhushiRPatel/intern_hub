const SIZES = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-4',
};

interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
  label?: string;
  color?: string;
}

export function Spinner({
  size = 'md',
  className = '',
  label,
  color = 'text-primary-600 dark:text-primary-400',
}: SpinnerProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${SIZES[size]} ${color} border-current border-t-transparent rounded-full animate-spin shrink-0`}
      />
      {label && (
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      )}
    </div>
  );
}

export function PageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
      <Spinner size="xl" />
      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">{label}</p>
    </div>
  );
}
