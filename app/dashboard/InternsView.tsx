'use client';
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/app/context/AuthContext';
import { useNavigation } from '@/app/context/NavigationContext';
import { demoStore } from '@/lib/demoStore';
import { INTERN_STATUSES, InternData } from '@/lib/constants';
import {
    GET_INTERNS, GET_DEPARTMENTS, GET_COLLEGES, GET_DASHBOARD_STATS,
} from '@/graphql/queries';
import InternTable from '@/app/components/InternList/page';
import InternFormModal, { InternFormValues } from '@/app/components/AddIntern/page';
import { FilterBar } from './FilterBar';
import { DeleteModal } from './DeleteModal';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export function InternsView() {
    const { user } = useAuth();
    const { setCurrentView } = useNavigation();

    const [search, setSearch] = useState('');
    const [dept, setDept] = useState('');
    const [college, setCollege] = useState('');
    const [status, setStatus] = useState('');

    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState<InternData | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

    const [formBusy, setFormBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const [demoRefresh, setDemoRefresh] = useState(0);
    const demoInterns = useMemo(() => {
        if (!IS_DEMO) return [];
        return demoStore.getInterns({
            search: search || undefined,
            department: dept || undefined,
            college: college || undefined,
            status: status || undefined,
            role: user?.role,
            userId: user?.id,
            departmentId: user?.department_id ?? undefined,
        });
    }, [search, dept, college, status, user, demoRefresh]);
    const demoColleges = useMemo(() => IS_DEMO ? demoStore.getColleges() : [], [demoRefresh]);

    const buildWhere = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, unknown> = {};
        if (user?.role === 'intern') where.user_id = { _eq: user.id };
        if (user?.role === 'department_person') where.department_id = { _eq: user.department_id };
        if (search) where.name = { _ilike: `%${search}%` };
        if (dept) where.department_id = { _eq: dept };
        if (college) where.college = { _ilike: `%${college}%` };
        if (status) where.status = { _eq: status };
        return where;
    };

    const { data: internGqlData, loading: gqlLoading, error: gqlError, refetch } = useQuery(
        GET_INTERNS,
        {
            variables: { where: buildWhere(), order_by: [{ created_at: 'desc' }] },
            skip: IS_DEMO,
        }
    );
    const { data: deptData } = useQuery(GET_DEPARTMENTS, { skip: IS_DEMO });
    const { data: collegeData } = useQuery(GET_COLLEGES, { skip: IS_DEMO });
    const { refetch: refetchStats } = useQuery(GET_DASHBOARD_STATS, { skip: IS_DEMO });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gql = internGqlData as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols = collegeData as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dep = deptData as any;

    const interns = IS_DEMO ? demoInterns : (gql?.interns ?? []) as InternData[];
    const colleges = IS_DEMO ? demoColleges : (cols?.interns?.map((i: { college: string }) => i.college) ?? []) as string[];
    const depts = IS_DEMO ? demoStore.getDepartments() : (dep?.departments ?? []);
    const loading = IS_DEMO ? false : gqlLoading;
    const errorMsg = IS_DEMO ? undefined : gqlError?.message;

    const handleEdit = (intern: InternData) => {
        setEditTarget(intern);
        setShowForm(true);
    };

    const handleFormSubmit = async (values: InternFormValues) => {
        setFormBusy(true);
        try {
            if (IS_DEMO) {
                if (editTarget) {
                    demoStore.update(editTarget.id, {
                        name: values.name.trim(),
                        email: values.email.trim().toLowerCase(),
                        phone: values.phone || undefined,
                        college: values.college.trim(),
                        degree: values.degree.trim(),
                        branch: values.branch.trim(),
                        department_id: values.department_id,
                        start_date: values.start_date,
                        end_date: values.end_date || undefined,
                        status: values.status,
                    });
                    showToast(`${values.name} updated successfully`);
                } else {
                    demoStore.create({
                        name: values.name.trim(),
                        email: values.email.trim().toLowerCase(),
                        phone: values.phone || undefined,
                        college: values.college.trim(),
                        degree: values.degree.trim(),
                        branch: values.branch.trim(),
                        department_id: values.department_id,
                        start_date: values.start_date,
                        end_date: values.end_date || undefined,
                        status: values.status,
                    });
                    showToast(`${values.name} added successfully`);
                }
                setDemoRefresh((n) => n + 1);
            } else {
                if (editTarget) {
                    const res = await fetch('/api/interns/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: editTarget.id,
                            name: values.name.trim(),
                            email: values.email.trim().toLowerCase(),
                            phone: values.phone || null,
                            college: values.college.trim(),
                            degree: values.degree.trim(),
                            branch: values.branch.trim(),
                            department_id: values.department_id,
                            start_date: values.start_date,
                            end_date: values.end_date || null,
                            status: values.status,
                        }),
                    });

                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.message || 'Failed to update intern');
                    }

                    await Promise.all([refetch(), refetchStats()]);
                    showToast(`${values.name} updated successfully`);
                } else {
                    // Use API route to create intern AND user
                    const res = await fetch('/api/interns/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: values.name.trim(),
                            email: values.email.trim().toLowerCase(),
                            phone: values.phone || null,
                            college: values.college.trim(),
                            degree: values.degree.trim(),
                            branch: values.branch.trim(),
                            department_id: values.department_id,
                            start_date: values.start_date,
                            end_date: values.end_date || null,
                            status: values.status,
                        }),
                    });

                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.message || 'Failed to add intern');
                    }

                    await Promise.all([refetch(), refetchStats()]);
                    showToast(`${values.name} added successfully`);
                }
            }
            setShowForm(false);
            setEditTarget(null);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Operation failed', 'error');
        } finally {
            setFormBusy(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleteBusy(true);
        try {
            if (IS_DEMO) {
                demoStore.delete(deleteTarget.id);
                setDemoRefresh((n) => n + 1);
            } else {
                const res = await fetch('/api/interns/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: deleteTarget.id }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || 'Failed to delete intern');
                }

                await Promise.all([refetch(), refetchStats()]);
            }
            showToast(`${deleteTarget.name} deleted`);
            setDeleteTarget(null);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    const clearFilters = () => {
        setSearch(''); setDept(''); setCollege(''); setStatus('');
    };

    const isAdmin = user?.role === 'admin';
    const showDept = user?.role !== 'intern';

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Interns</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {interns.length} intern{interns.length !== 1 ? 's' : ''} found
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { setEditTarget(null); setCurrentView('add-intern'); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Intern
                    </button>
                )}
            </div>

            <FilterBar
                search={search} setSearch={setSearch}
                dept={dept} setDept={setDept}
                college={college} setCollege={setCollege}
                status={status} setStatus={setStatus}
                onClear={clearFilters}
                colleges={colleges}
                showDeptFilter={showDept}
                departments={depts}
            />

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <InternTable
                    interns={interns}
                    departments={depts}
                    loading={loading}
                    error={errorMsg}
                    userRole={user?.role ?? 'intern'}
                    onEdit={handleEdit}
                    onDelete={(id, name) => setDeleteTarget({ id, name })}
                />
            </div>

            <InternFormModal
                isOpen={showForm}
                onClose={() => { setShowForm(false); setEditTarget(null); }}
                onSubmit={handleFormSubmit}
                initialData={editTarget}
                departments={depts}
                submitting={formBusy}
            />

            {deleteTarget && (
                <DeleteModal
                    name={deleteTarget.name}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                    submitting={deleteBusy}
                />
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.type === 'success'
                        ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    }
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
