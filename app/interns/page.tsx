'use client';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/app/context/AuthContext';
import { useAppDispatch, useUI } from '@/lib/hooks';
import { openImportModal, closeImportModal, openExportModal, closeExportModal, setInternFilters, clearInternFilters } from '@/lib/slices/uiSlice';
import { addNotificationAsync } from '@/lib/slices/notificationSlice';
import { DEPARTMENTS, INTERN_STATUSES, InternData, DEMO_DEPARTMENTS } from '@/lib/constants';
import { demoStore } from '@/lib/demoStore';
import { GET_INTERNS, GET_DEPARTMENTS, GET_COLLEGES } from '@/graphql/queries';
import { UPDATE_INTERN, DELETE_INTERN } from '@/graphql/mutations';
import InternTable from '@/app/components/InternList/page';
import {
  internFormValuesToDemoPayload,
} from '@/lib/internForm';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { Pagination } from '@/app/components/ui/Pagination';
import ImportModal from '@/app/components/ImportModal';
import ExportInternsModal from '@/app/components/ExportInternsModal';
import InternDetailModal from '@/app/components/InternDetailModal';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const ITEMS_PER_PAGE = 10;

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

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function InternsPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showImportModal, showExportModal, internFilters } = useUI();
  const { search, department: dept, college, status } = internFilters;

  const isAdmin = user?.role === 'admin';
  const isDeptPerson = user?.role === 'department_person';

  const [viewTarget, setViewTarget] = useState<InternData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    dispatch(addNotificationAsync({
      type,
      message: msg,
      duration: 4000,
    }));
  }, [dispatch]);

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

  const internsWhere = useMemo(
    () => buildWhere(),
    [search, dept, college, status, user?.role, user?.id, user?.department_id],
  );

  const { data: gqlData, loading: gqlLoading, error: gqlError, refetch } = useQuery(GET_INTERNS, {
    variables: {
      where: internsWhere,
      order_by: [{ created_at: 'desc' }],
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    },
    skip: IS_DEMO || isLoading,
    fetchPolicy: 'network-only',
  });
  const { data: deptData } = useQuery(GET_DEPARTMENTS, { skip: IS_DEMO });
  const { data: collegeData } = useQuery(GET_COLLEGES, { skip: IS_DEMO });

  const [updateMutation] = useMutation(UPDATE_INTERN, { onCompleted: () => refetch() });
  const [deleteMutation] = useMutation(DELETE_INTERN, { onCompleted: () => refetch() });

  const gql = gqlData as any; // eslint-disable-line
  const cols = collegeData as any; // eslint-disable-line
  const dep = deptData as any; // eslint-disable-line

  const interns = IS_DEMO
    ? demoInterns.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : (gql?.interns ?? []) as InternData[];
  const colleges = IS_DEMO ? demoColleges : (cols?.interns?.map((i: { college: string }) => i.college) ?? []) as string[];
  const depts = IS_DEMO ? demoDepts : (dep?.departments ?? []);
  const loading = IS_DEMO ? false : gqlLoading;
  const errorMsg = IS_DEMO ? undefined : gqlError?.message;
  const totalItems = IS_DEMO ? demoInterns.length : (gql?.interns_aggregate?.aggregate?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, dept, college, status]);

  useEffect(() => {
    if (loading || totalItems === 0) return;
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, loading, totalItems, totalPages]);

  const paginatedInterns = useMemo(() => interns, [interns]);

  /* ── Handlers ── */
  const handleView = (intern: InternData) => setViewTarget(intern);
  const handleEdit = (intern: InternData) => router.push(`/interns/add?edit=${intern.id}`);
  const handleAddIntern = () => router.push('/interns/add');

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

  const clearFilters = () => { dispatch(clearInternFilters()); };

  const showDept = user?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Interns</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {totalItems} intern{totalItems !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => dispatch(openExportModal())}
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5m0 0L7.5 12M12 7.5v9"
                />
              </svg>
            }
          >
            Export Excel
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => dispatch(openImportModal())}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                }
              >
                Import Excel
              </Button>
            </>
          )}
          {(isAdmin || isDeptPerson) && (
            <Button
              onClick={handleAddIntern}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Intern
            </Button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <FilterBar
        search={search} setSearch={(v) => dispatch(setInternFilters({ search: v }))}
        dept={dept} setDept={(v) => dispatch(setInternFilters({ department: v }))}
        college={college} setCollege={(v) => dispatch(setInternFilters({ college: v }))}
        status={status} setStatus={(v) => dispatch(setInternFilters({ status: v }))}
        onClear={clearFilters} colleges={colleges} showDeptFilter={showDept}
        depts={depts}
      />

      {/* ── Table ── */}
      <div className="bg-white dark:bg-[#1e1c2f] rounded-2xl border border-slate-100 dark:border-[#2d2a45] shadow-sm overflow-hidden">
        <InternTable
          interns={paginatedInterns}
          rowOffset={(currentPage - 1) * ITEMS_PER_PAGE}
          loading={loading}
          error={errorMsg}
          departments={depts}
          userRole={user?.role ?? 'intern'}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={(id, name) => setDeleteTarget({ id, name })}
        />
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── Modals ── */}
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          submitting={deleteBusy}
        />
      )}

      <ImportModal
        open={showImportModal}
        onClose={() => dispatch(closeImportModal())}
        departments={depts}
        onImportDone={() => {
          dispatch(closeImportModal());
          if (IS_DEMO) setDemoRefresh(n => n + 1);
          else refetch();
          showToast('Interns imported successfully');
        }}
      />

      <ExportInternsModal
        open={showExportModal}
        onClose={() => dispatch(closeExportModal())}
        interns={interns}
        departments={depts}
      />

      {/* ── Intern detail modal ── */}
      <InternDetailModal
        intern={viewTarget}
        departments={depts}
        onClose={() => setViewTarget(null)}
        onEdit={handleEdit}
        userRole={user?.role}
      />


    </div>
  );
}