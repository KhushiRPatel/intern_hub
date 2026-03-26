'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

type Step = 'email' | 'sent';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setStep('sent');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">

      {/* Back link */}
      <div className="absolute top-6 left-6">
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to login
        </Link>
      </div>

      <div className="w-full max-w-sm animate-fade-in">

        {step === 'email' ? (
          <>
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center">
              Forgot password?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-8 text-center leading-relaxed">
              No worries. Enter your email and we&apos;ll send reset instructions to your administrator.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
                leftAddon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              <Button type="submit" loading={submitting} fullWidth size="lg">
                {submitting ? 'Sending…' : 'Send Reset Instructions'}
              </Button>
            </form>
          </>
        ) : (
          /* Success state */
          <div className="text-center animate-fade-in-scale">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Check your email</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 mb-2 leading-relaxed">
              Reset instructions have been sent to
            </p>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mb-8">{email}</p>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400 mb-8 text-left">
              <p className="font-semibold mb-1">Note</p>
              <p>Passwords are managed by your organization. Please contact your administrator if you do not receive an email within a few minutes.</p>
            </div>

            <Button
              variant="outline"
              fullWidth
              onClick={() => { setStep('email'); setEmail(''); }}
            >
              Try a different email
            </Button>

            <Link href="/login" className="block mt-4">
              <Button variant="ghost" fullWidth>Back to login</Button>
            </Link>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
          Having trouble?{' '}
          <span className="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">
            Contact your administrator
          </span>
        </p>
      </div>
    </div>
  );
}
