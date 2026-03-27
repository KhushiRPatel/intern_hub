'use client';
import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

/* ── Inner (uses useSearchParams) ───────────────────────────────── */
function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';

  const [state, setState] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
  const [email, setEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* Validate token on mount */
  useEffect(() => {
    if (!token) { setState('invalid'); setTokenError('No reset token provided.'); return; }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) { setState('valid'); setEmail(data.email ?? ''); }
        else { setState('invalid'); setTokenError(data.message ?? 'Invalid link.'); }
      })
      .catch(() => { setState('invalid'); setTokenError('Could not validate reset link.'); });
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (password.length < 8) { setFormError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setFormError('Passwords do not match.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message ?? 'Failed to set password.'); return; }
      setState('success');
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ── */
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-indigo-500 animate-spin" />
        <p className="text-slate-500 dark:text-[#8b88ac] text-sm">Validating your link…</p>
      </div>
    );
  }

  /* ── Invalid / expired ── */
  if (state === 'invalid') {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Link Invalid or Expired</h2>
        <p className="text-slate-500 dark:text-[#8b88ac] text-sm">{tokenError}</p>
        <p className="text-xs text-slate-400 dark:text-[#4d4a6a]">
          Password reset links expire after 24 hours. Contact your administrator to send a new link.
        </p>
        <Link href="/login">
          <Button variant="outline" size="sm">Back to Sign In</Button>
        </Link>
      </div>
    );
  }

  /* ── Success ── */
  if (state === 'success') {
    return (
      <div className="text-center space-y-4">
        <div
          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
        >
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Password Set!</h2>
        <p className="text-slate-500 dark:text-[#8b88ac] text-sm">
          Your password has been set successfully. You can now sign in.
        </p>
        <Button onClick={() => router.push('/login')} size="md">
          Sign In Now
        </Button>
      </div>
    );
  }

  /* ── Set password form ── */
  return (
    <>
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
        >
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Set Your Password</h2>
        {email && (
          <p className="text-slate-500 dark:text-[#8b88ac] text-sm mt-1">
            Setting password for <span className="font-semibold text-indigo-600 dark:text-indigo-400">{email}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-fade-in">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {formError}
          </div>
        )}

        <Input
          label="New Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          required
          hint="Must be at least 8 characters"
          leftAddon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
          rightAddon={
            <button type="button" onClick={() => setShowPw(v => !v)} className="text-slate-400 hover:text-indigo-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {showPw
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                }
              </svg>
            </button>
          }
        />

        <Input
          label="Confirm Password"
          type={showPw ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          required
          leftAddon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        {/* Password strength indicator */}
        {password.length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[8, 12, 16].map((threshold) => (
                <div
                  key={threshold}
                  className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                    password.length >= threshold
                      ? threshold === 8 ? 'bg-red-400' : threshold === 12 ? 'bg-amber-400' : 'bg-emerald-400'
                      : 'bg-slate-200 dark:bg-[#2d2a45]'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 dark:text-[#6d6a8a]">
              {password.length < 8 ? 'Too short' : password.length < 12 ? 'Weak' : password.length < 16 ? 'Good' : 'Strong'}
            </p>
          </div>
        )}

        <Button type="submit" loading={submitting} fullWidth size="lg" className="mt-2">
          {submitting ? 'Setting password…' : 'Set Password & Sign In'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-[#4d4a6a]">
        Already have a password?{' '}
        <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

/* ── Page wrapper ───────────────────────────────────────────────── */
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0effe] dark:bg-[#0e0d19] p-6">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-xl font-black text-slate-900 dark:text-white">InternMS</span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1e1c2f] border border-slate-200 dark:border-[#2d2a45] rounded-2xl shadow-sm p-8">
          <Suspense fallback={
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-indigo-500 animate-spin" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
