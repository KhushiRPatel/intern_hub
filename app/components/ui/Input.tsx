'use client';
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from 'react';

/* ── shared label renderer ─────────────────────────────────────────────────── */
function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {text}
      {required && (
        <span className="ml-0.5 text-red-500 select-none" aria-hidden="true"> *</span>
      )}
    </label>
  );
}

/* ── Input ─────────────────────────────────────────────────────────────────── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftAddon, rightAddon, wrapperClassName = '', className = '', required, ...rest },
  ref,
) {
  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && <FieldLabel text={label} required={required} />}
      <div className="relative">
        {leftAddon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
            {leftAddon}
          </div>
        )}
        <input
          ref={ref}
          required={required}
          className={[
            'w-full px-3 py-2.5 text-sm rounded-xl border',
            'bg-white dark:bg-slate-900/80',
            'text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-red-400 focus:ring-red-300 bg-red-50/60 dark:bg-red-950/20 dark:border-red-700'
              : 'border-slate-200 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500',
            leftAddon  ? 'pl-9' : '',
            rightAddon ? 'pr-9' : '',
            className,
          ].filter(Boolean).join(' ')}
          {...rest}
        />
        {rightAddon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            {rightAddon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {!error && hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
});

/* ── Select ────────────────────────────────────────────────────────────────── */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, wrapperClassName = '', className = '', required, children, ...rest },
  ref,
) {
  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && <FieldLabel text={label} required={required} />}
      <select
        ref={ref}
        required={required}
        className={[
          'w-full px-3 py-2.5 text-sm rounded-xl border',
          'bg-white dark:bg-slate-900/80',
          'text-slate-900 dark:text-slate-100',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-400 focus:ring-red-300'
            : 'border-slate-200 dark:border-slate-700 focus:ring-primary-500 focus:border-primary-500',
          className,
        ].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {!error && hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
});

/* ── Textarea ──────────────────────────────────────────────────────────────── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, wrapperClassName = '', className = '', required, ...rest },
  ref,
) {
  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && <FieldLabel text={label} required={required} />}
      <textarea
        ref={ref}
        required={required}
        className={[
          'w-full px-3 py-2.5 text-sm rounded-xl border resize-none',
          'bg-white dark:bg-slate-900/80',
          'text-slate-900 dark:text-slate-100',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          error
            ? 'border-red-400'
            : 'border-slate-200 dark:border-slate-700',
          className,
        ].filter(Boolean).join(' ')}
        {...rest}
      />
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {!error && hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
});
