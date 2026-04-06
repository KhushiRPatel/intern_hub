'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/app/context/AuthContext';
import { useAppDispatch, useUI } from '@/lib/hooks';
import { addNotification } from '@/lib/slices/notificationSlice';
import { setDeptPersonFilters, clearDeptPersonFilters } from '@/lib/slices/uiSlice';
import { DEMO_DEPARTMENTS, DepartmentData } from '@/lib/constants';
import { GET_DEPARTMENT_PERSONS, GET_DEPARTMENTS } from '@/graphql/queries';
import { DELETE_DEPARTMENT_PERSON, UPDATE_DEPARTMENT_PERSON } from '@/graphql/mutations';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { Pagination } from '@/app/components/ui/Pagination';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
const ITEMS_PER_PAGE = 10;

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface DeptPerson {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  department_id: string;
  created_at: string;
}

/* ── Demo store (in-memory, no persistence) ─────────────────────────────────── */
let DEMO_PERSONS: DeptPerson[] = [
  { id: 'dp-001', name: 'Raj Mehta',   email: 'raj.ai@company.com',    phone: '9000000001', department_id: 'dept-ai-001',     created_at: new Date().toISOString() },
  { id: 'dp-002', name: 'Priya Shah',  email: 'priya.php@company.com', phone: '9000000002', department_id: 'dept-php-001',    created_at: new Date().toISOString() },
  { id: 'dp-003', name: 'Anil Kumar',  email: 'anil.rpa@company.com',  phone: '9000000003', department_id: 'dept-rpa-001',    created_at: new Date().toISOString() },
  { id: 'dp-004', name: 'Sneha Patel', email: 'sneha.qc@company.com',  phone: '9000000004', department_id: 'dept-qc-001',     created_at: new Date().toISOString() },
];

/* ── Delete Confirm Modal ───────────────────────────────────────────────────── */
function DeleteModal({ name, onConfirm, onCancel, submitting }: {
  name: string; onConfirm: () => void; onCancel: () => void; submitting: boolean;
}) {
  return (
    <Modal open onClose={onCancel} title="Delete Department Person?" size="sm">
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

/* ── Edit Modal ─────────────────────────────────────────────────────────────── */
function EditModal({ person, departments, onSave, onCancel, submitting }: {
  person: DeptPerson;
  departments: DepartmentData[];
  onSave: (updated: { name: string; email: string; phone: string; department_id: string }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState({
    name: person.name,
    email: person.email,
    phone: person.phone ?? '',
    department_id: person.department_id,
  });
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSave = () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Valid email is required'); return; }
    if (!form.department_id) { setError('Department is required'); return; }
    setError('');
    onSave(form);
  };

  return (
    <Modal open onClose={onCancel} title="Edit Department Person" size="md">
      <div className="px-6 py-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <Input type="text" value={form.name} onChange={set('name')} placeholder="Full name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <Input type="email" value={form.email} onChange={set('email')} placeholder="email@company.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
          <Input type="text" value={form.phone} onChange={set('phone')} placeholder="Phone number" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Department <span className="text-red-500">*</span>
          </label>
          <Select value={form.department_id} onChange={set('department_id')}>
            <option value="">Select department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button loading={submitting} onClick={handleSave} className="flex-1">
            {submitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Row ────────────────────────────────────────────────────────────────────── */
function PersonRow({ person, deptName, onEdit, onDelete }: {
  person: DeptPerson;
  deptName: string;
  onEdit: (p: DeptPerson) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0">
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900 dark:text-white">{person.name}</p>
            <p className="text-xs text-slate-400">{person.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{person.phone || '—'}</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          {deptName}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
        {new Date(person.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(person)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(person.id, person.name)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */
export default function DepartmentPersonsPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { deptPersonFilters } = useUI();

  // Admin-only guard
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'admin') router.replace('/dashboard');
  }, [isLoading, user, router]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    dispatch(addNotification({ type, message: msg, duration: 4000 }));
  }, [dispatch]);

  // ── Modal state ──
  const [editTarget, setEditTarget] = useState<DeptPerson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Demo state ──
  const [demoPersons, setDemoPersons] = useState<DeptPerson[]>(DEMO_PERSONS);

  // ── Departments ──
  const { data: deptGqlData } = useQuery<{ departments: DepartmentData[] }>(GET_DEPARTMENTS, { skip: IS_DEMO });
  const departments: DepartmentData[] = IS_DEMO ? DEMO_DEPARTMENTS : (deptGqlData?.departments ?? []);
  const deptMap = useMemo(() => Object.fromEntries(departments.map(d => [d.id, d.name])), [departments]);

  // ── GraphQL ──
  const buildWhere = () => {
    const conditions: Record<string, unknown>[] = [];
    if (deptPersonFilters.search) conditions.push({ name: { _ilike: `%${deptPersonFilters.search}%` } });
    if (deptPersonFilters.department) conditions.push({ department_id: { _eq: deptPersonFilters.department } });
    return conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { _and: conditions };
  };

  const { data: gqlData, loading: gqlLoading, error: gqlError, refetch } = useQuery<{ users: DeptPerson[] }>(GET_DEPARTMENT_PERSONS, {
    variables: { where: buildWhere(), order_by: [{ created_at: 'desc' }] },
    skip: IS_DEMO || isLoading,
    fetchPolicy: 'network-only',
  });

  const [updateMutation] = useMutation(UPDATE_DEPARTMENT_PERSON, { onCompleted: () => refetch() });
  const [deleteMutation] = useMutation(DELETE_DEPARTMENT_PERSON, { onCompleted: () => refetch() });

  // ── Derived data ──
  const allPersons: DeptPerson[] = IS_DEMO ? demoPersons : (gqlData?.users ?? []);
  const persons = useMemo(() => {
    if (!IS_DEMO) return allPersons;
    return allPersons.filter(p => {
      const matchSearch = !deptPersonFilters.search || p.name.toLowerCase().includes(deptPersonFilters.search.toLowerCase()) || p.email.toLowerCase().includes(deptPersonFilters.search.toLowerCase());
      const matchDept = !deptPersonFilters.department || p.department_id === deptPersonFilters.department;
      return matchSearch && matchDept;
    });
  }, [allPersons, deptPersonFilters]);

  const loading = !IS_DEMO && gqlLoading;
  const errorMsg = gqlError?.message ?? null;
  const hasFilter = deptPersonFilters.search || deptPersonFilters.department;
  const totalPages = Math.max(1, Math.ceil(persons.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [deptPersonFilters.search, deptPersonFilters.department]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedPersons = useMemo(
    () => persons.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [persons, currentPage],
  );

  // ── Handlers ──
  const handleEdit = (person: DeptPerson) => setEditTarget(person);

  const handleEditSave = async (updated: { name: string; email: string; phone: string; department_id: string }) => {
    if (!editTarget) return;
    setEditBusy(true);
    try {
      if (IS_DEMO) {
        const next = demoPersons.map(p => p.id === editTarget.id ? { ...p, ...updated } : p);
        setDemoPersons(next);
        DEMO_PERSONS = next;
      } else {
        await updateMutation({
          variables: {
            id: editTarget.id,
            set: {
              name: updated.name,
              email: updated.email,
              phone: updated.phone || null,
              department_id: updated.department_id,
            },
          },
        });
      }
      showToast(`${updated.name} updated`);
      setEditTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setEditBusy(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      if (IS_DEMO) {
        const next = demoPersons.filter(p => p.id !== deleteTarget.id);
        setDemoPersons(next);
        DEMO_PERSONS = next;
      } else {
        await deleteMutation({ variables: { id: deleteTarget.id } });
      }
      showToast(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Department Persons</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {persons.length} person{persons.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button
          onClick={() => router.push('/users/add-department-person')}
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Add Dept. Person
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white dark:bg-[#1e1c2f] rounded-2xl border border-slate-100 dark:border-[#2d2a45] p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="text" value={deptPersonFilters.search} onChange={e => dispatch(setDeptPersonFilters({ search: e.target.value }))}
            placeholder="Search by name or email…"
            leftAddon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          <Select value={deptPersonFilters.department} onChange={e => dispatch(setDeptPersonFilters({ department: e.target.value }))}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        {hasFilter && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 dark:text-slate-600">Active filters:</span>
            {[
              deptPersonFilters.search && `Name: "${deptPersonFilters.search}"`,
              deptPersonFilters.department && `Dept: ${deptMap[deptPersonFilters.department] ?? deptPersonFilters.department}`,
            ].filter(Boolean).map(tag => (
              <span key={tag as string} className="inline-flex items-center bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            <button onClick={() => dispatch(clearDeptPersonFilters())} className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-[#1e1c2f] rounded-2xl border border-slate-100 dark:border-[#2d2a45] shadow-sm overflow-hidden">
        {errorMsg && (
          <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900">
            {errorMsg}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : persons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600 gap-2">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-medium text-sm">No department persons found</p>
            {hasFilter && <p className="text-xs">Try clearing the filters</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Person</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedPersons.map(p => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    deptName={deptMap[p.department_id] ?? p.department_id}
                    onEdit={handleEdit}
                    onDelete={(id, name) => setDeleteTarget({ id, name })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={persons.length}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── Modals ── */}
      {editTarget && (
        <EditModal
          person={editTarget}
          departments={departments}
          onSave={handleEditSave}
          onCancel={() => setEditTarget(null)}
          submitting={editBusy}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          submitting={deleteBusy}
        />
      )}
    </div>
  );
}