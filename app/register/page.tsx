'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';

const DEPARTMENTS = ['.NET', 'SAP', 'AI', 'MOBILE', 'ODDO', 'RPA', 'PHP', 'QC'];

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', college: '', department: '', message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md text-center animate-fade-in-scale">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-6">
            <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Request Sent!</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 mb-8">
            Your access request has been submitted. An administrator will review your request and get in touch via <span className="font-medium text-slate-700 dark:text-slate-300">{form.email}</span>.
          </p>
          <Link href="/login">
            <Button variant="primary" fullWidth>Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative overflow-hidden bg-slate-950 flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, #22c55e 2px, transparent 0)`,
          backgroundSize: '80px 80px',
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary-950/30 to-transparent" />

        <div className="relative z-10 max-w-xs text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-6 shadow-2xl shadow-primary-900/50">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Join InternMS</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Request access to the intern management platform. Accounts are provisioned by administrators.
          </p>
          <div className="mt-8 space-y-3 text-left">
            {[
              'Admin creates your account',
              'You receive login credentials',
              'Access your personalized dashboard',
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-primary-400 text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <p className="text-slate-400 text-sm">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-fade-in">

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">InternMS</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Request Access</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 mb-8">
            Fill in your details and an admin will create your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name *"
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="Alice Johnson"
              required
            />
            <Input
              label="Email Address *"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="alice@example.com"
              required
            />
            <Input
              label="College / University *"
              type="text"
              value={form.college}
              onChange={set('college')}
              placeholder="IIT Mumbai"
              required
            />
            <Select
              label="Preferred Department"
              value={form.department}
              onChange={set('department')}
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Additional Message
              </label>
              <textarea
                value={form.message}
                onChange={set('message')}
                rows={3}
                placeholder="Any additional information for the admin…"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <Button type="submit" fullWidth size="lg" className="mt-2">
              Submit Request
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
