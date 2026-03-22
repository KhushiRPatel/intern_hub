'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { DEMO_DEPARTMENTS, DepartmentData } from '@/lib/constants';

type FormValues = {
    name: string;
    email: string;
    department_id: string;
};

async function resJsonSafe<T = unknown>(res: Response): Promise<T> {
    const text = await res.text();
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 140)}`);
    }
}

export default function AddDepartmentPersonPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const [departments, setDepartments] = useState<DepartmentData[]>(DEMO_DEPARTMENTS);
    const [deptsLoading, setDeptsLoading] = useState(false);
    const [deptsError, setDeptsError] = useState<string | null>(null);

    const [form, setForm] = useState<FormValues>({
        name: '',
        email: '',
        department_id: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

    const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        if (user.role !== 'admin') {
            router.replace('/dashboard');
        }
    }, [isLoading, user, router]);

    useEffect(() => {
        if (IS_DEMO) {
            setDepartments(DEMO_DEPARTMENTS);
            setDeptsError(null);
            setDeptsLoading(false);
            return;
        }

        let cancelled = false;
        setDeptsLoading(true);
        setDeptsError(null);

        fetch('/api/departments')
            .then(async (res) => {
                if (!res.ok) {
                    const data = await resJsonSafe<{ message?: string }>(res).catch(
                        () => ({}) as { message?: string }
                    );
                    throw new Error(data.message || 'Failed to fetch departments');
                }
                const data = await resJsonSafe<{ departments?: DepartmentData[] }>(res);
                if (!cancelled) setDepartments(data.departments || []);
            })
            .catch((e) => {
                if (cancelled) return;
                setDeptsError(e instanceof Error ? e.message : 'Failed to fetch departments');
                setDepartments([]);
            })
            .finally(() => {
                if (!cancelled) setDeptsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [IS_DEMO]);

    const validate = () => {
        if (!form.name.trim()) return 'Name is required';
        if (!form.email.trim()) return 'Email is required';
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(form.email)) return 'Invalid email';
        if (!form.department_id) return 'Department is required';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const vErr = validate();
        if (vErr) {
            setError(vErr);
            return;
        }

        setSubmitting(true);
        try {
            if (IS_DEMO) {
                // Keep demo-mode behavior minimal: show message (no persistence)
                setCredentials({
                    email: form.email.trim().toLowerCase(),
                    tempPassword: 'DEMO_TEMP_PASSWORD',
                });
            } else {
                const res = await fetch('/api/users/create-department-person', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: form.name.trim(),
                        email: form.email.trim().toLowerCase(),
                        department_id: form.department_id,
                    }),
                });

                const data = await resJsonSafe<{ credentials?: { email: string; tempPassword: string }; message?: string }>(res);
                if (!res.ok) throw new Error(data.message || 'Failed to create department person');

                if (data.credentials) setCredentials(data.credentials);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create department person');
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading || (!IS_DEMO && deptsLoading)) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const showNoDepartments = !IS_DEMO && !deptsLoading && !deptsError && departments.length === 0;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
                    type="button"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                <h2 className="text-2xl font-bold text-slate-800">Add Department Person</h2>
                <p className="text-sm text-slate-500 mt-1">Admin can create a department user. Credentials will be generated automatically.</p>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {!IS_DEMO && deptsError && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
                    {deptsError}
                </div>
            )}

            {showNoDepartments && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
                    No departments found in Hasura. Seed the `departments` table first.
                </div>
            )}

            {credentials && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-900 px-4 py-3 rounded-xl text-sm">
                    <div className="font-semibold mb-1">Created Successfully</div>
                    <div>Email: {credentials.email}</div>
                    <div>Temporary Password: {credentials.tempPassword}</div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800"
                        type="text"
                        placeholder="e.g. Sarah Sharma"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800"
                        type="email"
                        placeholder="sarah@example.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                    <select
                        value={form.department_id}
                        onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800"
                    >
                        <option value="">Select department</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? 'Creating...' : 'Create Department Person'}
                    </button>
                </div>
            </form>
        </div>
    );
}

