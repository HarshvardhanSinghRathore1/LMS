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
  ChevronLeft,
  ChevronRight,
  Compass,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: ('ADMIN' | 'TRAINER' | 'TRAINEE')[];
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const role = user?.role || 'TRAINEE';

  const mainNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'My Learning', href: '/my-learning', icon: GraduationCap, roles: ['TRAINEE'] },
    { label: 'AI Study Tutor', href: '/my-learning/assistant', icon: Bot, roles: ['TRAINEE'], badge: 'AI' },
    { label: 'Course Catalog', href: '/courses', icon: BookOpen },
    { label: 'Assessments', href: '/assessments', icon: CheckSquare },
    { label: 'Competencies', href: '/competencies', icon: Award },
    { label: 'AI Recommendations', href: '/recommendations', icon: Sparkles, roles: ['TRAINEE'], badge: 'AI' },
    { label: 'AI Content Studio', href: '/ai-tools', icon: Sparkles, roles: ['TRAINER', 'ADMIN'], badge: 'AI' },
    { label: 'Certificates', href: '/certificates', icon: ShieldCheck, roles: ['TRAINEE', 'ADMIN'] },
    { label: 'Trainer Matching', href: '/trainer-matching', icon: Users, roles: ['TRAINEE', 'TRAINER'] },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  const adminNavItems: NavItem[] = [
    { label: 'Enterprise Audit', href: '/admin/audit', icon: ShieldCheck, roles: ['ADMIN'] },
    { label: 'System Diagnostics', href: '/admin/system', icon: Cpu, roles: ['ADMIN', 'TRAINER'] },
  ];

  const filterByRole = (item: NavItem) => {
    if (!isAuthenticated) {
      // For unauthenticated, show public core routes
      return ['/', '/courses'].includes(item.href);
    }
    if (!item.roles) return true;
    return item.roles.includes(role);
  };

  const visibleMainItems = mainNavItems.filter(filterByRole);
  const visibleAdminItems = adminNavItems.filter(filterByRole);

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`hidden lg:flex flex-col bg-carbon-black dark:bg-[#161a1d] light:bg-white border-r border-silver/15 dark:border-white/10 light:border-gray-200 transition-all duration-300 ease-in-out shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Main Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-silver/70 dark:text-silver/70 light:text-gray-400">
              Platform Navigation
            </div>
          )}
          {visibleMainItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                  active
                    ? 'bg-gradient-to-r from-mahogany-red/20 to-strawberry-red/10 dark:from-mahogany-red/30 dark:to-strawberry-red/10 light:bg-red-50 text-strawberry-red dark:text-strawberry-red light:text-mahogany-red border border-mahogany-red/30 light:border-red-200 shadow-sm'
                    : 'text-silver dark:text-silver light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900 hover:bg-silver/10 light:hover:bg-gray-100 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    active
                      ? 'text-strawberry-red dark:text-strawberry-red light:text-mahogany-red'
                      : 'text-silver/80 dark:text-silver/80 light:text-gray-500 group-hover:text-white dark:group-hover:text-white light:group-hover:text-gray-900'
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-dark-garnet/40 text-strawberry-red border border-mahogany-red/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Administration & Technical Section */}
        {visibleAdminItems.length > 0 && (
          <div className="pt-2 border-t border-silver/10 light:border-gray-200 space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-silver/70 dark:text-silver/70 light:text-gray-400">
                Administration
              </div>
            )}
            {visibleAdminItems.map((item) => {
              const Icon = item.icon;
              const active = isLinkActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                    active
                      ? 'bg-dark-garnet/30 light:bg-red-50 text-strawberry-red light:text-mahogany-red border border-mahogany-red/40 light:border-red-200'
                      : 'text-silver dark:text-silver light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900 hover:bg-silver/10 light:hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      active ? 'text-strawberry-red' : 'text-silver/80 light:text-gray-500'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-silver/10 light:border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-[11px] text-silver/60 dark:text-silver/60 light:text-gray-400 font-mono">
            v1.0 • Stage 11
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-silver hover:text-white dark:text-silver dark:hover:text-white light:text-gray-600 light:hover:text-gray-900 hover:bg-silver/10 light:hover:bg-gray-100 transition-colors mx-auto lg:mx-0"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
