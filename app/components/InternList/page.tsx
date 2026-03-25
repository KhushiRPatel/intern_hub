'use client';
import { InternData, STATUS_COLORS, UserRole } from '@/lib/constants';

interface Props {
    interns: InternData[];
    departments: { id: string; name: string }[];
    loading: boolean;
    error?: string;
    userRole: UserRole;
    onEdit: (intern: InternData) => void;
    onDelete: (id: string, name: string) => void;
}

function StatusBadge({ status }: { status: InternData['status'] }) {
    return (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[status]}`}>
            {status}
        </span>
    );
}

export default function InternTable({ interns, departments, loading, error, userRole, onEdit, onDelete }: Props) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
                Loading interns…
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
                <strong>Error:</strong> {error}
            </div>
        );
    }

    if (interns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="font-medium">No interns found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        {['#', 'Name', 'College', 'Department', 'Start Date', 'Status', 'Actions'].map((h) => (
                            <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {interns.map((intern, idx) => (
                        <tr key={intern.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-3">
                                <div>
                                    <p className="font-medium text-slate-800">{intern.name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{intern.email}</p>
                                    {intern.phone && (
                                        <p className="text-xs text-slate-400">{intern.phone}</p>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{intern.college}</td>
                            <td className="px-4 py-3">
                                <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                    {departments.find(d => d.id === intern.department_id)?.name ?? '—'}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                {new Date(intern.start_date).toLocaleDateString('en-IN', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                })}
                                {intern.end_date && (
                                    <p className="text-xs text-slate-400">
                                        → {new Date(intern.end_date).toLocaleDateString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                        })}
                                    </p>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <StatusBadge status={intern.status} />
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    {/* Edit — admin and dept_person can edit */}
                                    {(userRole === 'admin' || userRole === 'department_person') && (
                                        <button
                                            onClick={() => onEdit(intern)}
                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                            title="Edit"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                    )}
                                    {/* Delete — admin only */}
                                    {userRole === 'admin' && (
                                        <button
                                            onClick={() => onDelete(intern.id, intern.name)}
                                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                    {/* Intern: view-only badge */}
                                    {userRole === 'intern' && (
                                        <span className="text-xs text-slate-400 italic">view only</span>
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
