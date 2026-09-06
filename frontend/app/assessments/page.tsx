'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  Assessment,
  AssessmentMetrics,
  fetchAssessmentsApi,
  fetchAssessmentMetricsApi,
  createAssessmentApi,
  publishAssessmentApi,
} from '@/lib/assessments';
import { fetchCoursesApi, Course } from '@/lib/courses';
import {
  FileCheck,
  Plus,
  Clock,
  Award,
  BookOpen,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';

export default function AssessmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [metrics, setMetrics] = useState<AssessmentMetrics | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Modal / Form state for Admin / Trainer
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCourseId, setCreateCourseId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPassingScore, setCreatePassingScore] = useState(70);
  const [createTimeLimit, setCreateTimeLimit] = useState<number | ''>(30);
  const [createMaxAttempts, setCreateMaxAttempts] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManagementAllowed = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [assessRes, coursesRes] = await Promise.all([
        fetchAssessmentsApi({ limit: 100 }),
        fetchCoursesApi({ limit: 100 }),
      ]);

      setAssessments(assessRes.assessments);
      setCourses(coursesRes.courses);

      if (isManagementAllowed) {
        try {
          const metricsRes = await fetchAssessmentMetricsApi();
          setMetrics(metricsRes);
        } catch (e) {
          console.error('Failed to load metrics', e);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to load assessments data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCourseId || !createTitle) {
      alert('Course and Assessment Title are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await createAssessmentApi({
        courseId: createCourseId,
        title: createTitle,
        description: createDescription,
        passingScorePercentage: createPassingScore,
        timeLimitMinutes: createTimeLimit === '' ? null : Number(createTimeLimit),
        maxAttempts: createMaxAttempts,
      });

      setStatusMsg('🎉 Assessment draft created successfully!');
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDescription('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to create assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (assessmentId: string) => {
    try {
      await publishAssessmentApi(assessmentId);
      setStatusMsg('🎉 Assessment published successfully!');
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to publish assessment');
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
              <span className="text-[#b1a7a6] text-sm">/ Assessment Hub</span>
            </div>
            <div className="flex items-center space-x-3">
              {isManagementAllowed && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#660708] to-[#a4161a] hover:from-[#a4161a] hover:to-[#e5383b] rounded-lg shadow transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Assessment</span>
                </button>
              )}
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-[#f5f3f4] bg-[#2b2b2b] hover:bg-[#3b3b3b] rounded-lg transition-colors border border-[#4a4a4a]"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <FileCheck className="w-8 h-8 text-[#e5383b]" />
                Assessment Engine & Testing
              </h1>
              <p className="mt-1 text-[#b1a7a6]">
                Automated MCQ & True/False testing, real-time scoring engine, and pass/fail evaluations.
              </p>
            </div>
          </div>

          {/* Alerts */}
          {statusMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-sm flex justify-between items-center">
              <span>{statusMsg}</span>
              <button onClick={() => setStatusMsg(null)} className="font-bold hover:underline">Dismiss</button>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-[#660708]/30 border border-[#a4161a] text-[#e5383b] text-sm">
              <span>Error: {errorMsg}</span>
            </div>
          )}

          {/* Admin / Trainer Metrics Display */}
          {!loading && isManagementAllowed && metrics && (
            <div className="mb-10 bg-[#161a1d] border border-[#2b2b2b] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#e5383b]"></span>
                  Organization Assessment Metrics
                </h2>
                <span className="text-xs text-[#b1a7a6]">Tenant-isolated</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Total Assessments</p>
                  <p className="text-2xl font-black text-white mt-1">{metrics.totalAssessments}</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Published</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{metrics.publishedAssessments}</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Total Attempts</p>
                  <p className="text-2xl font-black text-blue-400 mt-1">{metrics.totalAttempts}</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Passed Attempts</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{metrics.passedAttempts}</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Avg Score</p>
                  <p className="text-2xl font-black text-amber-400 mt-1">{metrics.averageScorePercentage}%</p>
                </div>
                <div className="bg-[#0b090a] p-4 rounded-xl border border-[#2b2b2b]">
                  <p className="text-xs text-[#b1a7a6] font-medium">Pass Rate</p>
                  <p className="text-2xl font-black text-[#e5383b] mt-1">{metrics.passRatePercentage}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-[#a4161a] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-[#b1a7a6] text-sm">Loading assessment records...</p>
            </div>
          ) : assessments.length === 0 ? (
            <div className="bg-[#161a1d] border border-[#2b2b2b] rounded-2xl p-12 text-center my-8 shadow-xl">
              <div className="w-16 h-16 bg-[#2b2b2b] text-[#e5383b] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                📝
              </div>
              <h3 className="text-xl font-bold text-white">No assessments found</h3>
              <p className="text-[#b1a7a6] text-sm mt-2 max-w-md mx-auto">
                {isManagementAllowed
                  ? 'Create an assessment for an existing course to start testing organizational competencies.'
                  : 'No published assessments are available for your enrolled courses yet.'}
              </p>
            </div>
          ) : (
            /* Assessment Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#161a1d] border border-[#2b2b2b] hover:border-[#a4161a]/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-[#2b2b2b] text-[#b1a7a6] flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-[#e5383b]" />
                        {item.course_title || 'Course Assessment'}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold rounded ${
                          item.status === 'PUBLISHED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : item.status === 'DRAFT'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white group-hover:text-[#e5383b] transition-colors line-clamp-2">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-sm text-[#b1a7a6] mt-2 line-clamp-3">
                        {item.description}
                      </p>
                    )}

                    {/* Stats List */}
                    <div className="mt-4 space-y-1.5 text-xs font-mono text-neutral-300">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Questions & Points:</span>
                        <span className="font-bold text-white">{item.questions_count || 0} Questions ({item.total_points || 0} pts)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Passing Threshold:</span>
                        <span className="font-bold text-emerald-400">{item.passing_score_percentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Time Limit:</span>
                        <span className="text-amber-400 font-semibold">{item.time_limit_minutes ? `${item.time_limit_minutes} Mins` : 'Untimed'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Max Attempts:</span>
                        <span className="text-white">{item.max_attempts}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-6 pt-4 border-t border-[#2b2b2b] flex items-center justify-between gap-3">
                    {user?.role === 'TRAINEE' ? (
                      <Link
                        href={`/assessments/${item.id}/take`}
                        className="w-full py-2.5 px-4 rounded-xl text-center text-sm font-bold bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 text-white shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Take Assessment</span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        {item.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePublish(item.id)}
                            className="flex-1 py-2 px-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Publish</span>
                          </button>
                        )}
                        <Link
                          href={`/courses/${item.course_id}`}
                          className="flex-1 py-2 px-3 bg-[#2b2b2b] hover:bg-[#3b3b3b] text-white text-xs font-bold rounded-xl transition-colors text-center"
                        >
                          View Course
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Create Assessment Modal (Admin & Trainer) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#161a1d] border border-[#2b2b2b] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-[#2b2b2b] pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#e5383b]" />
                  Create New Assessment
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateAssessment} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Target Course *</label>
                  <select
                    value={createCourseId}
                    onChange={(e) => setCreateCourseId(e.target.value)}
                    required
                    className="w-full bg-[#0b090a] border border-[#2b2b2b] rounded-lg p-2.5 text-white focus:border-[#a4161a] focus:outline-none"
                  >
                    <option value="">-- Select Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Assessment Title *</label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    required
                    placeholder="e.g. Mid-Term Competency Assessment"
                    className="w-full bg-[#0b090a] border border-[#2b2b2b] rounded-lg p-2.5 text-white focus:border-[#a4161a] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Description</label>
                  <textarea
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description of skills tested..."
                    className="w-full bg-[#0b090a] border border-[#2b2b2b] rounded-lg p-2.5 text-white focus:border-[#a4161a] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-neutral-300 font-medium mb-1">Pass Score (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={createPassingScore}
                      onChange={(e) => setCreatePassingScore(Number(e.target.value))}
                      className="w-full bg-[#0b090a] border border-[#2b2b2b] rounded-lg p-2.5 text-white focus:border-[#a4161a] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-300 font-medium mb-1">Time Limit (m)</label>
                    <input
                      type="number"
                      min={1}
                      value={createTimeLimit}
                      onChange={(e) => setCreateTimeLimit(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Untimed"
                      className="w-full bg-[#0b090a] border border-[#2b2b2b] rounded-lg p-2.5 text-white focus:border-[#a4161a] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-300 font-medium mb-1">Max Attempts</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={createMaxAttempts}
                      onChange={(e) => setCreateMaxAttempts(Number(e.target.value))}
                      className="w-full bg-[#0b090a] border border-[#2b2b2b] rounded-lg p-2.5 text-white focus:border-[#a4161a] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-[#2b2b2b]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-[#2b2b2b] text-neutral-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-[#660708] to-[#a4161a] text-white font-bold rounded-lg shadow"
                  >
                    {isSubmitting ? 'Saving...' : 'Create Draft'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
