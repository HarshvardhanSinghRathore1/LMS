'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  CourseEnrollment,
  EnrollmentStatus,
  OrganizationMetrics,
  fetchMyEnrollmentsApi,
  fetchOrganizationMetricsApi,
  dropEnrollmentApi,
} from '@/lib/enrollments';

export default function MyLearningPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [metrics, setMetrics] = useState<OrganizationMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);

        // Fetch Trainee Enrollments if Trainee
        if (user.role === 'TRAINEE') {
          const res = await fetchMyEnrollmentsApi();
          setEnrollments(res.enrollments);
        }

        // Fetch Org Metrics if Admin or Trainer
        if (user.role === 'ADMIN' || user.role === 'TRAINER') {
          try {
            const metricsRes = await fetchOrganizationMetricsApi();
            setMetrics(metricsRes);
          } catch (e) {
            console.error('Failed to load metrics', e);
          }
        }
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.error?.message || 'Failed to load page data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleDropEnrollment = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to drop this course? Historical records will be retained.')) {
      return;
    }

    try {
      setActionLoadingId(enrollmentId);
      const updated = await dropEnrollmentApi(enrollmentId);
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, status: updated.status } : e))
      );
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to drop course enrollment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredEnrollments = enrollments.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return item.status === 'ENROLLED' || item.status === 'IN_PROGRESS';
    return item.status === activeTab;
  });

  const getStatusBadge = (status: EnrollmentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">✓ Completed</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-900/60 text-amber-300 border border-amber-700/50">⚡ In Progress</span>;
      case 'ENROLLED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-900/60 text-blue-300 border border-blue-700/50">📌 Enrolled</span>;
      case 'DROPPED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">🚫 Dropped</span>;
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0b090a] text-[#f5f3f4] font-sans selection:bg-[#a4161a] selection:text-white">
        {/* Header Bar */}
        <header className="border-b border-[#2b2b2b] bg-[#161a1d]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-xl font-black tracking-wider text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#660708] via-[#a4161a] to-[#e5383b] flex items-center justify-center font-bold text-white text-sm">
                  CC
                </span>
                CAPACITY CONNECT
              </Link>
              <span className="text-[#b1a7a6] text-sm">/ My Learning</span>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/courses"
                className="px-4 py-2 text-sm font-medium text-[#f5f3f4] bg-[#2b2b2b] hover:bg-[#3b3b3b] rounded-lg transition-colors border border-[#4a4a4a]"
              >
                Browse Catalog
              </Link>
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#660708] to-[#a4161a] hover:from-[#a4161a] hover:to-[#e5383b] rounded-lg shadow transition-all"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Title Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">My Learning & Progress</h1>
              <p className="mt-1 text-[#b1a7a6]">
                Track your enrolled courses, monitor lesson completion, and build organizational capacity.
              </p>
            </div>
          </div>

          {/* Loading Spinner */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-[#a4161a] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-[#b1a7a6] text-sm">Loading your learning workspace...</p>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-[#660708]/30 border border-[#a4161a] text-[#f5f3f4]">
              <p className="text-sm font-medium text-[#e5383b]">Error: {errorMsg}</p>
            </div>
          )}

          {/* Admin / Trainer Metrics Display */}
          {!loading && (user?.role === 'ADMIN' || user?.role === 'TRAINER') && metrics && (
            <div className="mb-10 bg-[#161a1d] border border-[#2b2b2b] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#e5383b]"></span>
                  Organization Learning Metrics ({user.role})
                </h2>
                <span className="text-xs text-[#b1a7a6]">Tenant-isolated</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Total Enrollments</p>
                  <p className="text-2xl font-black text-white mt-1">{metrics.totalEnrollments}</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Active Learners</p>
                  <p className="text-2xl font-black text-amber-400 mt-1">{metrics.activeEnrollments}</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Completed Courses</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{metrics.completedEnrollments}</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Dropped Enrollments</p>
                  <p className="text-2xl font-black text-zinc-400 mt-1">{metrics.droppedEnrollments}</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Avg Org Progress</p>
                  <p className="text-2xl font-black text-[#e5383b] mt-1">{metrics.averageProgressPercentage}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Trainee Learning Workspace */}
          {!loading && user?.role === 'TRAINEE' && (
            <div>
              {/* Status Filter Tabs */}
              <div className="flex items-center space-x-2 mb-6 border-b border-[#2b2b2b] pb-3 overflow-x-auto">
                {[
                  { id: 'ALL', label: 'All Enrollments' },
                  { id: 'ACTIVE', label: 'In Progress' },
                  { id: 'COMPLETED', label: 'Completed' },
                  { id: 'DROPPED', label: 'Dropped' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-[#a4161a] text-white shadow'
                        : 'text-[#b1a7a6] hover:bg-[#161a1d] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Empty Enrollments State */}
              {filteredEnrollments.length === 0 ? (
                <div className="bg-[#161a1d] border border-[#2b2b2b] rounded-2xl p-12 text-center my-8 shadow-xl">
                  <div className="w-16 h-16 bg-[#2b2b2b] text-[#e5383b] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                    📚
                  </div>
                  <h3 className="text-xl font-bold text-white">No courses found</h3>
                  <p className="text-[#b1a7a6] text-sm mt-2 max-w-md mx-auto">
                    {activeTab === 'ALL'
                      ? "You haven't enrolled in any capacity building courses yet. Explore our catalog to start learning!"
                      : `No enrollments match status "${activeTab}".`}
                  </p>
                  <Link
                    href="/courses"
                    className="inline-block mt-6 px-6 py-3 bg-gradient-to-r from-[#660708] to-[#a4161a] hover:from-[#a4161a] hover:to-[#e5383b] text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
                  >
                    Explore Course Catalog
                  </Link>
                </div>
              ) : (
                /* Enrollments Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEnrollments.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#161a1d] border border-[#2b2b2b] hover:border-[#a4161a]/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all group"
                    >
                      <div>
                        {/* Top Header Card */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-[#2b2b2b] text-[#b1a7a6]">
                            {item.category || 'General'}
                          </span>
                          {getStatusBadge(item.status)}
                        </div>

                        {/* Course Title */}
                        <h3 className="text-xl font-bold text-white group-hover:text-[#e5383b] transition-colors line-clamp-2">
                          {item.course_title}
                        </h3>

                        <p className="text-sm text-[#b1a7a6] mt-2 line-clamp-3">
                          {item.course_description}
                        </p>
                      </div>

                      {/* Progress Engine Footer */}
                      <div className="mt-6 pt-4 border-t border-[#2b2b2b]">
                        <div className="flex items-center justify-between text-xs text-[#b1a7a6] mb-2 font-medium">
                          <span>Progress ({item.completed_lessons_count} / {item.total_lessons_count} lessons)</span>
                          <span className="font-bold text-white">{item.progress_percentage}%</span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-[#0b090a] rounded-full h-2.5 overflow-hidden border border-[#2b2b2b]">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              item.status === 'COMPLETED'
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                : item.status === 'DROPPED'
                                ? 'bg-zinc-600'
                                : 'bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b]'
                            }`}
                            style={{ width: `${item.progress_percentage}%` }}
                          ></div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="mt-5 flex items-center justify-between gap-3">
                          <Link
                            href={`/courses/${item.course_id}`}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-center text-sm font-bold transition-all ${
                              item.status === 'DROPPED'
                                ? 'bg-[#2b2b2b] text-zinc-400 cursor-not-allowed'
                                : 'bg-[#a4161a] hover:bg-[#e5383b] text-white shadow-md'
                            }`}
                          >
                            {item.status === 'COMPLETED'
                              ? 'Review Course'
                              : item.status === 'DROPPED'
                              ? 'Dropped'
                              : 'Resume Course'}
                          </Link>

                          {item.status !== 'COMPLETED' && item.status !== 'DROPPED' && (
                            <button
                              onClick={() => handleDropEnrollment(item.id)}
                              disabled={actionLoadingId === item.id}
                              className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-800 text-xs font-semibold transition-colors"
                              title="Drop course enrollment"
                            >
                              {actionLoadingId === item.id ? '...' : 'Drop'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
