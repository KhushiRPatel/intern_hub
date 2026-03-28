'use client';
import { InternData, UserRole } from '@/lib/constants';
import { StatusBadge, DeptBadge } from '@/app/components/ui/Badge';
import { Avatar } from '@/app/components/ui/Avatar';
import { Spinner } from '@/app/components/ui/Spinner';

interface Props {
  interns?: InternData[];
  departments?: { id: string; name: string }[];
  loading?: boolean;
  error?: string;
  userRole?: UserRole;
  onEdit?: (intern: InternData) => void;
  onDelete?: (id: string, name: string) => void;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function InternTable({
  interns = [],
  departments = [],
  loading = false,
  error,
  userRole = 'intern',
  onEdit = () => {},
  onDelete = () => {},
}: Props) {

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" label="Loading interns…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-5 py-4 text-sm">
        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L3.068 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <p className="font-semibold">Failed to load interns</p>
          <p className="text-xs mt-0.5 opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  if (interns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="font-semibold text-slate-600 dark:text-slate-400">No interns found</p>
        <p className="text-sm mt-1">Try adjusting your filters or adding a new intern</p>
      </div>
    );
  }

  const canEdit   = userRole === 'admin' || userRole === 'department_person';
  const canDelete = userRole === 'admin';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            {['#', 'Intern', 'College', 'Department', 'Duration', 'Status', 'Actions'].map(h => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
          {interns.map((intern, idx) => (
            <tr
              key={intern.id}
              className="bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group"
            >
              {/* # */}
              <td className="px-4 py-3.5 text-slate-400 dark:text-slate-600 text-xs font-medium w-10">
                {idx + 1}
              </td>

              {/* Intern info */}
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={intern.name} size="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate leading-none">
                      {intern.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{intern.email}</p>
                    {intern.phone && (
                      <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">{intern.phone}</p>
                    )}
                  </div>
                </div>
              </td>

              {/* College */}
              <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap text-sm">
                {intern.college}
              </td>

              {/* Department */}
              <td className="px-4 py-3.5">
                <DeptBadge name={departments.find(d => d.id === intern.department_id)?.name ?? '—'} />
              </td>

              {/* Duration */}
              <td className="px-4 py-3.5 whitespace-nowrap">
                <p className="text-sm text-slate-700 dark:text-slate-300">{fmt(intern.start_date)}</p>
                {intern.end_date && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">→ {fmt(intern.end_date)}</p>
                )}
              </td>

              {/* Status */}
              <td className="px-4 py-3.5">
                <StatusBadge status={intern.status} />
              </td>

              {/* Actions */}
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canEdit && (
                    <button
                      onClick={() => onEdit(intern)}
                      title="Edit"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 dark:hover:text-primary-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onDelete(intern.id, intern.name)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  {!canEdit && !canDelete && (
                    <span className="text-xs text-slate-400 italic px-1.5">View only</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
