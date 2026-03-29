'use client';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/app/context/AuthContext';
import { DEPARTMENTS, INTERN_STATUSES, InternData, DEMO_DEPARTMENTS } from '@/lib/constants';
import { demoStore } from '@/lib/demoStore';
import { GET_INTERNS, GET_DEPARTMENTS, GET_COLLEGES } from '@/graphql/queries';
import { UPDATE_INTERN, DELETE_INTERN } from '@/graphql/mutations';
import InternTable from '@/app/components/InternList/page';
import InternFormModal, { InternFormValues } from '@/app/components/AddIntern/page';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import ImportModal from '@/app/components/ImportModal';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

/* ── Filter bar ─────────────────────────────────────────────────────────────── */
function FilterBar({
  search, setSearch, dept, setDept, college, setCollege,
  status, setStatus, onClear, colleges, showDeptFilter, depts,
}: {
  search: string; setSearch: (v: string) => void;
  dept: string; setDept: (v: string) => void;
  college: string; setCollege: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  onClear: () => void; colleges: string[]; showDeptFilter: boolean;
  depts: { id: string; name: string }[];
}) {
  const hasFilter = search || dept || college || status;
  return (
    <div className="bg-white dark:bg-[#1e1c2f] rounded-2xl border border-slate-100 dark:border-[#2d2a45] p-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name…"
          leftAddon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        {showDeptFilter && (
          <Select value={dept} onChange={e => setDept(e.target.value)}>
            <option value="">All Departments</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        )}
        <Select value={college} onChange={e => setCollege(e.target.value)}>
          <option value="">All Colleges</option>
          {colleges.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {INTERN_STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </Select>
      </div>
      {hasFilter && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 dark:text-slate-600">Active filters:</span>
          {[
            search && `Name: "${search}"`,
            dept && `Dept: ${depts.find(d => d.id === dept)?.name ?? dept}`,
            college && `College: "${college}"`,
            status && `Status: ${status}`,
          ].filter(Boolean).map(tag => (
            <span key={tag as string} className="inline-flex items-center bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          <button onClick={onClear} className="ml-auto text-xs text-red-500 hover:text-red-700 dark:text-red-400 font-medium transition-colors">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Delete modal ───────────────────────────────────────────────────────────── */
function DeleteModal({ name, onConfirm, onCancel, submitting }: {
  name: string; onConfirm: () => void; onCancel: () => void; submitting: boolean;
}) {
  return (
    <Modal open onClose={onCancel} title="Delete Intern?" size="sm">
      <div className="px-6 py-5">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L3.068 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            This will permanently delete{' '}
            <span className="font-bold text-slate-900 dark:text-white">{name}</span>.
            This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button variant="danger" loading={submitting} onClick={onConfirm} className="flex-1">
            {submitting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Toast ──────────────────────────────────────────────────────────────────── */
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-slide-in-right ${type === 'success' ? 'bg-primary-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success'
        ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      }
      {msg}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function InternsPage() {
  const { user, token, isLoading } = useAuth();

  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [college, setCollege] = useState('');
  const [status, setStatus] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editTarget, setEditTarget] = useState<InternData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── Demo data ── */
  const [demoRefresh, setDemoRefresh] = useState(0);
  const demoInterns = useMemo(() => {
    if (!IS_DEMO) return [];
    return demoStore.getInterns({
      search: search || undefined, department: dept || undefined,
      college: college || undefined, status: status || undefined,
      role: user?.role, userId: user?.id, departmentId: user?.department_id ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dept, college, status, user, demoRefresh]);
  const demoColleges = useMemo(() => IS_DEMO ? demoStore.getColleges() : [], [demoRefresh]); // eslint-disable-line
  const demoDepts = useMemo(() => IS_DEMO ? demoStore.getDepartments() : [], []);

  /* ── GraphQL ── */
  const buildWhere = () => {
    const conditions: Record<string, unknown>[] = [];
    // Role-based row restriction (must not be overridden by filter bar)
    if (user?.role === 'intern' && user.id) {
      conditions.push({ user_id: { _eq: user.id } });
    } else if (user?.role === 'department_person' && user.department_id) {
      conditions.push({ department_id: { _eq: user.department_id } });
    }
    if (search) conditions.push({ name: { _ilike: `%${search}%` } });
    // dept filter only applies to admin — dept_person is already scoped to their dept
    if (dept && user?.role === 'admin') conditions.push({ department_id: { _eq: dept } });
    if (college) conditions.push({ college: { _ilike: `%${college}%` } });
    if (status) conditions.push({ status: { _eq: status } });
    return conditions.length === 0 ? {}
      : conditions.length === 1 ? conditions[0]
      : { _and: conditions };
  };

  const { data: gqlData, loading: gqlLoading, error: gqlError, refetch } = useQuery(GET_INTERNS, {
    variables: { where: buildWhere(), order_by: [{ created_at: 'desc' }] },
    skip: IS_DEMO || isLoading,
  });
  const { data: deptData } = useQuery(GET_DEPARTMENTS, { skip: IS_DEMO });
  const { data: collegeData } = useQuery(GET_COLLEGES, { skip: IS_DEMO });

  const [updateMutation] = useMutation(UPDATE_INTERN, { onCompleted: () => refetch() });
  const [deleteMutation] = useMutation(DELETE_INTERN, { onCompleted: () => refetch() });

  const gql = gqlData as any; // eslint-disable-line
  const cols = collegeData as any; // eslint-disable-line
  const dep = deptData as any; // eslint-disable-line

  const interns = IS_DEMO ? demoInterns : (gql?.interns ?? []) as InternData[];
  const colleges = IS_DEMO ? demoColleges : (cols?.interns?.map((i: { college: string }) => i.college) ?? []) as string[];
  const depts = IS_DEMO ? demoDepts : (dep?.departments ?? []);
  const loading = IS_DEMO ? false : gqlLoading;
  const errorMsg = IS_DEMO ? undefined : gqlError?.message;

  /* ── Handlers ── */
  const handleEdit = (intern: InternData) => { setEditTarget(intern); setShowForm(true); };

  const handleFormSubmit = async (values: InternFormValues) => {
    setFormBusy(true);
    try {
      const basePayload = {
        name: values.name.trim(), email: values.email.trim().toLowerCase(),
        phone: values.phone || undefined, college: values.college.trim(),
        degree: values.degree.trim(), branch: values.branch.trim(),
        department_id: values.department_id, start_date: values.start_date,
        end_date: values.end_date || undefined, status: values.status,
      };

      if (IS_DEMO) {
        if (editTarget) {
          demoStore.update(editTarget.id, basePayload);
          showToast(`${values.name} updated`);
        } else {
          demoStore.create(basePayload);
          showToast(`${values.name} added — demo mode`);
        }
        setDemoRefresh(n => n + 1);
      } else {
        if (editTarget) {
          // Edit: GraphQL mutation (no password/account changes needed)
          await updateMutation({
            variables: {
              id: editTarget.id,
              set: {
                name: basePayload.name, phone: basePayload.phone ?? null,
                college: basePayload.college, degree: basePayload.degree,
                branch: basePayload.branch, department_id: basePayload.department_id,
                start_date: basePayload.start_date, end_date: basePayload.end_date ?? null,
                status: basePayload.status,
              },
            },
          });
          showToast(`${values.name} updated`);
        } else {
          // ✅ FIX: Authorization header added so checkAuth() passes
          const res = await fetch('/api/interns/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: basePayload.name, email: basePayload.email,
              phone: basePayload.phone ?? null, college: basePayload.college,
              degree: basePayload.degree, branch: basePayload.branch,
              department_id: basePayload.department_id,
              start_date: basePayload.start_date,
              end_date: basePayload.end_date ?? null,
              status: basePayload.status,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to add intern');
          const emailMsg = data.emailSent ? ' · Setup email sent' : ' · Email not configured';
          showToast(`${values.name} added${emailMsg}`);
          refetch();
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
      if (IS_DEMO) { demoStore.delete(deleteTarget.id); setDemoRefresh(n => n + 1); }
      else { await deleteMutation({ variables: { id: deleteTarget.id } }); }
      showToast(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const clearFilters = () => { setSearch(''); setDept(''); setCollege(''); setStatus(''); };

  const isAdmin = user?.role === 'admin';
  const showDept = user?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Interns</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {interns.length} intern{interns.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImport(true)}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              }
            >
              Import Excel
            </Button>
            <Button
              onClick={() => { setEditTarget(null); setShowForm(true); }}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Intern
            </Button>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <FilterBar
        search={search} setSearch={setSearch}
        dept={dept} setDept={setDept}
        college={college} setCollege={setCollege}
        status={status} setStatus={setStatus}
        onClear={clearFilters} colleges={colleges} showDeptFilter={showDept}
        depts={depts}
      />

      {/* ── Table ── */}
      <div className="bg-white dark:bg-[#1e1c2f] rounded-2xl border border-slate-100 dark:border-[#2d2a45] shadow-sm overflow-hidden">
        <InternTable
          interns={interns} loading={loading} error={errorMsg}
          departments={depts}
          userRole={user?.role ?? 'intern'}
          onEdit={handleEdit}
          onDelete={(id, name) => setDeleteTarget({ id, name })}
        />
      </div>

      {/* ── Modals ── */}
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

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        departments={depts}
        onImportDone={() => {
          setShowImport(false);
          if (IS_DEMO) setDemoRefresh(n => n + 1);
          else refetch();
          showToast('Interns imported successfully');
        }}
      />

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}