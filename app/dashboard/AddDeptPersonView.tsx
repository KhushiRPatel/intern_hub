'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/app/context/AuthContext';  // ← removed useNavigation
import { GET_DEPARTMENTS, GET_DEPARTMENT_PERSONS } from '@/graphql/queries';
import { UPDATE_DEPARTMENT_PERSON, DELETE_DEPARTMENT_PERSON } from '@/graphql/mutations';
import DeptPersonFormModal, { DeptPersonFormValues } from '@/app/components/AddDeptPerson/page';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

interface DeptPerson {
  id: string; name: string; email: string;
  phone?: string; department_id: string; created_at: string;
}

export function AddDeptPersonView() {
  const { user, token } = useAuth(); // ← token added

  const [showForm,     setShowForm]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<DeptPerson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formBusy,     setFormBusy]     = useState(false);
  const [deleteBusy,   setDeleteBusy]   = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const { data: personGqlData, loading: gqlLoading, error: gqlError, refetch } = useQuery(
    GET_DEPARTMENT_PERSONS,
    { variables: { where: {}, order_by: [{ created_at: 'desc' }] }, skip: IS_DEMO },
  );
  const { data: deptData } = useQuery(GET_DEPARTMENTS, { skip: IS_DEMO });

  // ← INSERT removed — create goes through API route for password generation
  const [updateMutation] = useMutation(UPDATE_DEPARTMENT_PERSON, { onCompleted: () => refetch() });
  const [deleteMutation] = useMutation(DELETE_DEPARTMENT_PERSON, { onCompleted: () => refetch() });

  const gql = personGqlData as any; // eslint-disable-line
  const dep = deptData      as any; // eslint-disable-line

  const persons  = IS_DEMO ? [] : (gql?.users ?? []) as DeptPerson[];
  const depts    = IS_DEMO ? [] : (dep?.departments ?? []);
  const loading  = IS_DEMO ? false : gqlLoading;
  const errorMsg = IS_DEMO ? undefined : gqlError?.message;

  const handleEdit = (person: DeptPerson) => { setEditTarget(person); setShowForm(true); };

  const handleFormSubmit = async (values: DeptPersonFormValues) => {
    setFormBusy(true);
    try {
      if (editTarget) {
        // Update: GraphQL mutation (no password change needed)
        await updateMutation({
          variables: {
            id: editTarget.id,
            set: {
              name:          values.name.trim(),
              email:         values.email.trim().toLowerCase(),
              phone:         values.phone || null,
              department_id: values.department_id,
            },
          },
        });
        showToast(`${values.name} updated successfully`);
      } else {
        // Create: API route — handles password hash + email setup link
        const res = await fetch('/api/users/create-department-person', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // ← auth guard fix
          },
          body: JSON.stringify({
            name:          values.name.trim(),
            email:         values.email.trim().toLowerCase(),
            phone:         values.phone || null,
            department_id: values.department_id,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to add department person');
        await refetch();
        showToast(`${values.name} added successfully`);
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
      await deleteMutation({ variables: { id: deleteTarget.id } });
      showToast(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Department Persons</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {persons.length} person{persons.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Person
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            Loading…
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm m-5">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}
        {!loading && persons.length === 0 && !errorMsg && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-medium">No department persons found</p>
          </div>
        )}
        {!loading && persons.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {['#', 'Name', 'Phone', 'Department', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {persons.map((person, idx) => (
                  <tr key={person.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{person.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{person.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {person.phone || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {depts.find((d: any) => d.id === person.department_id)?.name ?? '—'} {/* eslint-disable-line */}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(person)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium text-xs">
                            Edit
                          </button>
                          <button onClick={() => setDeleteTarget({ id: person.id, name: person.name })}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 font-medium text-xs">
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeptPersonFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        onSubmit={handleFormSubmit}
        initialData={editTarget}
        departments={depts}
        submitting={formBusy}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Delete Person?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleteBusy}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-semibold">
                {deleteBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
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