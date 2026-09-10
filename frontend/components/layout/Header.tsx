'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationBell } from '../ui/NotificationBell';
import { Badge } from '../ui/Badge';
import {
  Search,
  Moon,
  Sun,
  Menu,
  X,
  User,
  LogOut,
  Sparkles,
  ChevronDown,
  Layers,
  Settings,
  Shield,
  BookOpen,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/courses');
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'CC';
  };

  const roleVariant = user?.role === 'ADMIN' ? 'brand' : user?.role === 'TRAINER' ? 'warning' : 'info';

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-carbon-black/90 dark:bg-[#161a1d]/90 light:bg-white/95 backdrop-blur-md border-b border-silver/15 dark:border-white/10 light:border-gray-200 transition-colors duration-200">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle navigation"
            className="p-2 rounded-lg text-silver hover:text-white dark:text-silver dark:hover:text-white light:text-gray-600 light:hover:text-gray-900 hover:bg-silver/10 light:hover:bg-gray-100 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mahogany-red to-strawberry-red flex items-center justify-center text-white shadow-md shadow-mahogany-red/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white dark:text-white light:text-gray-900">
                  CAPACITY CONNECT
                </span>
                <span className="hidden md:inline-flex px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase rounded bg-dark-garnet/50 dark:bg-dark-garnet/40 light:bg-red-50 text-strawberry-red border border-mahogany-red/30">
                  SMART ED
                </span>
              </div>
              <p className="text-[10px] text-silver dark:text-silver light:text-gray-500 font-medium tracking-tight">
                Intelligent Capacity Building
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-silver dark:text-silver light:text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search courses, skills, competencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm rounded-lg bg-onyx/70 dark:bg-[#0b090a]/80 light:bg-gray-100 border border-silver/20 dark:border-silver/15 light:border-gray-200 text-white dark:text-white light:text-gray-900 placeholder-silver/60 dark:placeholder-silver/60 light:placeholder-gray-400 focus:outline-none focus:border-strawberry-red focus:ring-1 focus:ring-strawberry-red transition-all"
            />
          </form>
        </div>

        {/* Right: Actions, Notifications, Theme, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          {isAuthenticated && <NotificationBell />}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-lg text-silver hover:text-white dark:text-silver dark:hover:text-white light:text-gray-600 light:hover:text-gray-900 hover:bg-silver/10 light:hover:bg-gray-100 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
          </button>

          {/* User Profile / Auth Actions */}
          {isAuthenticated && user ? (
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-silver/10 light:hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dark-garnet to-mahogany-red text-white flex items-center justify-center font-bold text-xs shadow-sm border border-mahogany-red/40">
                  {getInitials(user.name, user.email)}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-white dark:text-white light:text-gray-900 leading-tight truncate max-w-[120px]">
                    {user.name || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-strawberry-red font-semibold uppercase tracking-wider">
                    {user.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-silver dark:text-silver light:text-gray-500 hidden sm:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-carbon-black dark:bg-[#161a1d] light:bg-white border border-silver/20 dark:border-white/10 light:border-gray-200 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-silver/10 light:border-gray-100">
                    <p className="text-xs text-silver dark:text-silver light:text-gray-500">Signed in as</p>
                    <p className="text-sm font-bold text-white dark:text-white light:text-gray-900 truncate mt-0.5">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-silver/80 dark:text-silver/80 light:text-gray-500 truncate mt-0.5">
                      {user.email}
                    </p>
                    <div className="mt-2">
                      <Badge variant={roleVariant} size="sm">
                        {user.role} ACCOUNT
                      </Badge>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/my-learning"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-silver dark:text-silver light:text-gray-700 hover:text-white dark:hover:text-white light:hover:text-gray-900 hover:bg-silver/10 light:hover:bg-gray-50 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      My Learning
                    </Link>
                    {(user.role === 'ADMIN' || user.role === 'TRAINER') && (
                      <Link
                        href="/admin/system"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-silver dark:text-silver light:text-gray-700 hover:text-white dark:hover:text-white light:hover:text-gray-900 hover:bg-silver/10 light:hover:bg-gray-50 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 text-strawberry-red" />
                        System Diagnostics
                      </Link>
                    )}
                  </div>

                  <div className="pt-1 border-t border-silver/10 light:border-gray-100">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-strawberry-red hover:bg-dark-garnet/30 light:hover:bg-red-50 transition-colors text-left font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white dark:text-white light:text-gray-800 hover:bg-silver/10 light:hover:bg-gray-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-mahogany-red to-strawberry-red text-white shadow-sm hover:from-mahogany-red-2 hover:to-strawberry-red transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
