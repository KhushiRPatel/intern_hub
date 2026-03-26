import { INTERN_STATUSES } from '@/lib/constants';
import type { DepartmentData } from '@/lib/constants';

export function FilterBar({
    search, setSearch,
    dept, setDept,
    college, setCollege,
    status, setStatus,
    onClear,
    colleges, showDeptFilter,
    departments = [],
}: {
    search: string; setSearch: (v: string) => void;
    dept: string; setDept: (v: string) => void;
    college: string; setCollege: (v: string) => void;
    status: string; setStatus: (v: string) => void;
    onClear: () => void;
    colleges: string[];
    showDeptFilter: boolean;
    departments?: DepartmentData[];
}) {
    const hasFilter = search || dept || college || status;
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
                    />
                </div>

                {showDeptFilter && (
                    <select
                        value={dept}
                        onChange={(e) => setDept(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
                    >
                        <option value="">All Departments</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                )}

                <select
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
                >
                    <option value="">All Colleges</option>
                    {colleges.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
                >
                    <option value="">All Statuses</option>
                    {INTERN_STATUSES.map((s) => (
                        <option key={s} value={s} className="capitalize">
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {hasFilter && (
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Active filters:</span>
                    {[
                        search && `Name: "${search}"`,
                        dept && `Dept: ${departments.find((d) => d.id === dept)?.name || dept}`,
                        college && `College: "${college}"`,
                        status && `Status: ${status}`
                    ]
                        .filter(Boolean)
                        .map((tag) => (
                            <span key={tag as string} className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {tag}
                            </span>
                        ))}
                    <button
                        onClick={onClear}
                        className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}
