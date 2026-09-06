'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationCode, setOrganizationCode] = useState('ORG001');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name || !email || !password || !organizationCode) {
      setErrorMsg('Please complete all fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ name, email, password, organizationCode });
      router.push('/');
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Registration failed. Check details and try again.';
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
            SIH 2026 • Stage 1 Auth
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Create Trainee Account</h1>
          <p className="text-xs text-[var(--silver)]">Register under your organization to begin capacity building</p>
        </div>

        {/* Role Security Notice */}
        <div className="bg-neutral-900/80 border border-neutral-700 text-neutral-300 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2">
          <span>ℹ️</span>
          <span>Public registration grants <strong>TRAINEE</strong> access. Trainer and Admin accounts are provisioned via Admin governance.</span>
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
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
            />
          </div>

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
              Organization Code
            </label>
            <input
              type="text"
              required
              value={organizationCode}
              onChange={(e) => setOrganizationCode(e.target.value.toUpperCase())}
              placeholder="ORG001"
              className="w-full bg-[var(--onyx)] border border-neutral-700 focus:border-[var(--strawberry-red)] rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-500 outline-none font-mono transition-colors"
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
              placeholder="At least 8 characters"
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
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Register Account</span>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-neutral-800 text-xs text-[var(--silver)]">
          Already registered?{' '}
          <Link href="/login" className="text-[var(--strawberry-red)] hover:underline font-semibold">
            Sign In Here
          </Link>
        </div>
      </div>
    </main>
  );
}
