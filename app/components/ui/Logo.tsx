import React from 'react';

interface LogoProps {
  /** Size of the chevron icon in pixels */
  iconSize?: number;
  /** Extra classes on the wrapper */
  className?: string;
  /** Show only the icon mark (no text) */
  iconOnly?: boolean;
}

/**
 * InternMS brand logo — chevron mark + split-color wordmark.
 * Adapts to light / dark mode automatically.
 */
export function Logo({ iconSize = 34, className = '', iconOnly = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* ── Chevron mark ── */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 34 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Top chevron — brighter */}
        <path
          d="M5 19 L17 7 L29 19"
          stroke="#10b981"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bottom chevron — slightly muted for layered depth */}
        <path
          d="M5 27 L17 15 L29 27"
          stroke="#10b981"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />
      </svg>

      {/* ── Wordmark ── */}
      {!iconOnly && (
        <span className="font-extrabold text-[1.08rem] tracking-tight leading-none">
          <span className="text-slate-900 dark:text-white">INTERN</span>
          <span className="text-emerald-500">MS</span>
        </span>
      )}
    </div>
  );
}

export default Logo;
