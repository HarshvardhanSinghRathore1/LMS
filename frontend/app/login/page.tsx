'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      router.push('/');
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Invalid credentials or connection error.';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--onyx)] text-[var(--white-smoke)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--carbon-black)] border border-neutral-800 rounded-xl p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--strawberry-red)] bg-red-950/40 px-3 py-1 rounded-full border border-red-900/40">
            SIH 2026 • PS 26075
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Capacity Connect</h1>
          <p className="text-xs text-[var(--silver)]">Sign in to your enterprise learning session</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-950/50 border border-red-800 text-[var(--strawberry-red)] px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <span className="font-bold">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--silver)]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[var(--mahogany-red)] hover:bg-[var(--strawberry-red)] disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-neutral-800 text-xs text-[var(--silver)]">
          Need an account?{' '}
          <Link href="/register" className="text-[var(--strawberry-red)] hover:underline font-semibold">
            Register Trainee Account
          </Link>
        </div>
      </div>
    </main>
  );
}
