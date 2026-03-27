'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_DEPARTMENTS, GET_INTERNS, GET_DASHBOARD_STATS } from '@/graphql/queries';
import { useAuth } from '@/app/context/AuthContext';
import { useNavigation } from '@/app/context/NavigationContext';
import { demoStore } from '@/lib/demoStore';
import { DEMO_DEPARTMENTS } from '@/lib/constants';
import InternFormModal, { InternFormValues } from '@/app/components/AddIntern/page';

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export function AddInternView() {
    const { user } = useAuth();
    const { setCurrentView } = useNavigation();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [demoRefresh, setDemoRefresh] = useState(0);

    const [departments, setDepartments] = useState(IS_DEMO ? DEMO_DEPARTMENTS : []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: deptData } = useQuery(GET_DEPARTMENTS, { skip: IS_DEMO }) as any;
    useEffect(() => { 
      if (deptData?.departments) setDepartments(deptData.departments);
    }, [deptData]);

    const { refetch: refetchInterns } = useQuery(GET_INTERNS, { 
      variables: { where: {}, order_by: [{ created_at: 'desc' }] },
      skip: IS_DEMO 
    });
    const { refetch: refetchStats } = useQuery(GET_DASHBOARD_STATS, { skip: IS_DEMO });

    if (user && user.role !== 'admin') {
        return (
            <div className="text-center py-20">
                <p className="text-red-600 font-semibold">Access Denied</p>
                <p className="text-slate-500 text-sm mt-2">Only admins can add interns</p>
            </div>
        );
    }

    const handleSubmit = async (values: InternFormValues) => {
        setSubmitting(true);
        setError('');
        try {
            if (IS_DEMO) {
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
                setCurrentView('interns');
                setDemoRefresh((n) => n + 1);
            } else {
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

                // Refetch data to update UI
                await Promise.all([refetchInterns(), refetchStats()]);
                setCurrentView('interns');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add intern');
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Add New Intern</h2>
                <p className="text-sm text-slate-500 mt-1">Fill in the details to register a new intern</p>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <InternFormModal
                isOpen={true}
                isInline={true}
                onClose={() => setCurrentView('interns')}
                onSubmit={handleSubmit}
                initialData={null}
                departments={departments}
                submitting={submitting}
            />
        </div>
    );
}
