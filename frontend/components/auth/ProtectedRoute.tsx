'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--onyx)] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[var(--strawberry-red)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--silver)] text-sm font-mono tracking-wider">Verifying Session Security...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Next.js router redirect handles this
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-[var(--onyx)] text-[var(--white-smoke)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[var(--carbon-black)] border border-red-900/50 rounded-xl p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-red-950 text-[var(--strawberry-red)] rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            403
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Access Forbidden</h2>
          <p className="text-sm text-[var(--silver)]">
            Your role (<span className="text-[var(--strawberry-red)] font-semibold">{user.role}</span>) does not have authorization to view this protected resource.
          </p>
          <div className="pt-2">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-[var(--carbon-black)] border border-gray-700 hover:border-gray-500 rounded-lg text-sm text-[var(--white-smoke)] transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
