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
  const [error, setError] = useState('');
  // For demo/dev mode when SMTP is not configured
  const [devResetLink, setDevResetLink] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      // If SMTP not configured, API returns resetLink for dev/demo use
      if (data.resetLink) {
        setDevResetLink(data.resetLink);
      }

      setStep('sent');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">

      {/* Back link */}
      <div className="absolute top-6 left-6">
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400
            hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
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
              Enter your email and we&apos;ll send you a password reset link.
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

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              )}

              <Button type="submit" loading={submitting} fullWidth size="lg">
                {submitting ? 'Sending…' : 'Send Reset Link'}
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
              If an account exists for
            </p>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mb-8">{email}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              you will receive a password reset link shortly. The link expires in 24 hours.
            </p>

            {/* Dev mode: show reset link when SMTP is not configured */}
            {devResetLink && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800
                rounded-xl p-4 text-sm text-left mb-6">
                <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  Dev mode — SMTP not configured
                </p>
                <p className="text-amber-600 dark:text-amber-500 text-xs mb-2">
                  Use this link to reset your password:
                </p>
                <Link
                  href={devResetLink}
                  className="text-primary-600 dark:text-primary-400 text-xs break-all underline"
                >
                  {devResetLink}
                </Link>
              </div>
            )}

            <Button
              variant="outline"
              fullWidth
              onClick={() => { setStep('email'); setEmail(''); setDevResetLink(''); }}
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
