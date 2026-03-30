'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/dashboard');
  }, [user, isLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">

      {/* ── Left panel (branding) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-slate-950 flex-col items-center justify-center p-12">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, #22c55e 2px, transparent 0), radial-gradient(circle at 75px 75px, #22c55e 1px, transparent 0)`,
          backgroundSize: '100px 100px',
        }} />
        {/* Green glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-sm text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-3xl mb-8 shadow-2xl shadow-primary-900/50">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Intern<br />
            <span className="text-primary-400">Management</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Manage your intern program with ease — track progress, assign departments, and stay organized.
          </p>

          {/* Stats */}
          
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">InternMS</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Error alert */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-fade-in">
                <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              leftAddon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                leftAddon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                rightAddon={
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              loading={submitting}
              fullWidth
              size="lg"
              className="mt-2"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Demo credentials</p>
            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-500">
              <div className="flex justify-between">
                <span>Admin:</span>
                <code className="text-slate-700 dark:text-slate-300">admin@company.com / admin123</code>
              </div>
              <div className="flex justify-between">
                <span>Dept.Person (AI):</span>
                <code className="text-slate-700 dark:text-slate-300">ra.ai@student.com / dept123</code>
              </div>
              <div className="flex justify-between">
                <span>Dept.Person (PHP):</span>
                <code className="text-slate-700 dark:text-slate-300">priya.php@company.com / dept123</code>
              </div>
              <div className="flex justify-between">
                <span>Intern:</span>
                <code className="text-slate-700 dark:text-slate-300">john.intern@student.com / intern123</code>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600">
            Access is managed by your administrator.{' '}
            <Link href="/register" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
              Request access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
