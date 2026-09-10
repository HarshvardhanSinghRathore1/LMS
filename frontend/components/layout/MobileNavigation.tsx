'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  CheckSquare,
  Award,
  Sparkles,
  Bot,
  Users,
  BarChart3,
  ShieldCheck,
  Cpu,
  X,
  LogOut,
  User,
} from 'lucide-react';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const role = user?.role || 'TRAINEE';

  if (!isOpen) return null;

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'My Learning', href: '/my-learning', icon: GraduationCap, roles: ['TRAINEE'] },
    { label: 'Courses', href: '/courses', icon: BookOpen },
    { label: 'Assessments', href: '/assessments', icon: CheckSquare },
    { label: 'Competencies', href: '/competencies', icon: Award },
    { label: 'AI Recommendations', href: '/recommendations', icon: Sparkles, roles: ['TRAINEE'] },
    { label: 'AI Tutor & Tools', href: '/ai-tools', icon: Bot },
    { label: 'Certificates', href: '/certificates', icon: ShieldCheck, roles: ['TRAINEE', 'ADMIN'] },
    { label: 'Trainer Matching', href: '/trainer-matching', icon: Users, roles: ['TRAINEE', 'TRAINER'] },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Enterprise Audit', href: '/admin/audit', icon: ShieldCheck, roles: ['ADMIN'] },
    { label: 'System Diagnostics', href: '/admin/system', icon: Cpu, roles: ['ADMIN', 'TRAINER'] },
  ];

  const visibleItems = navItems.filter((item) => {
    if (!isAuthenticated) return ['/', '/courses'].includes(item.href);
    if (!item.roles) return true;
    return item.roles.includes(role as any);
  });

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-carbon-black dark:bg-[#161a1d] light:bg-white border-r border-silver/20 dark:border-white/10 light:border-gray-200 shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-250">
        {/* Drawer Header */}
        <div className="p-4 border-b border-silver/10 light:border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mahogany-red to-strawberry-red flex items-center justify-center text-white font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white dark:text-white light:text-gray-900 leading-tight">
                Capacity Connect
              </h2>
              <p className="text-[10px] text-strawberry-red font-semibold uppercase">Smart Education</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg text-silver hover:text-white dark:text-silver dark:hover:text-white light:text-gray-600 hover:bg-silver/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info if logged in */}
        {isAuthenticated && user && (
          <div className="px-4 py-3 bg-onyx/40 dark:bg-[#0b090a]/50 light:bg-gray-50 border-b border-silver/10 light:border-gray-200">
            <div className="text-xs font-semibold text-white dark:text-white light:text-gray-900 truncate">
              {user.name || user.email}
            </div>
            <div className="text-[10px] text-strawberry-red font-medium uppercase mt-0.5">
              {user.role} • {user.email}
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-gradient-to-r from-mahogany-red/30 to-strawberry-red/10 light:bg-red-50 text-strawberry-red light:text-mahogany-red border border-mahogany-red/30'
                    : 'text-silver dark:text-silver light:text-gray-700 hover:text-white dark:hover:text-white light:hover:text-gray-900 hover:bg-silver/10 light:hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-silver/10 light:border-gray-200">
          {isAuthenticated ? (
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-dark-garnet/40 hover:bg-dark-garnet/70 text-strawberry-red border border-mahogany-red/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                onClick={onClose}
                className="flex-1 py-2 text-center text-xs font-semibold rounded-lg border border-silver/20 text-white hover:bg-silver/10 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-gradient-to-r from-mahogany-red to-strawberry-red text-white transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
