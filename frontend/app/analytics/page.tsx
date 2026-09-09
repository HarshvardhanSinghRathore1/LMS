'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  getOrgDashboardApi,
  getTraineeSummaryApi,
  getCourseLeaderboardApi,
  getTraineeLeaderboardApi,
  getSkillGapDistributionApi,
  invalidateSnapshotApi,
} from '@/lib/analytics';
import type {
  OrgDashboardMetrics,
  TraineeSummaryMetrics,
  CourseLeaderboardEntry,
  TraineeLeaderboardEntry,
  SkillGapDistribution,
} from '@/lib/analytics.types';

import OrgSummaryBar from '@/components/analytics/OrgSummaryBar';
import EnrollmentFunnelChart from '@/components/analytics/EnrollmentFunnelChart';
import AssessmentMetricsPanel from '@/components/analytics/AssessmentMetricsPanel';
import TopSkillGapsTable from '@/components/analytics/TopSkillGapsTable';
import SkillGapHeatmap from '@/components/analytics/SkillGapHeatmap';
import CourseLeaderboard from '@/components/analytics/CourseLeaderboard';
import TraineeLeaderboard from '@/components/analytics/TraineeLeaderboard';
import TrainerSessionPanel from '@/components/analytics/TrainerSessionPanel';
import RecommendationUptakePanel from '@/components/analytics/RecommendationUptakePanel';
import PersonalSummaryBar from '@/components/analytics/PersonalSummaryBar';
import PersonalProgressPanel from '@/components/analytics/PersonalProgressPanel';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isTrainer = user?.role === 'TRAINER';
  const isTrainee = user?.role === 'TRAINEE';
  const isOrgViewer = isAdmin || isTrainer;

  // Org-level state
  const [orgMetrics, setOrgMetrics] = useState<OrgDashboardMetrics | null>(null);
  const [courseLeaderboard, setCourseLeaderboard] = useState<CourseLeaderboardEntry[]>([]);
  const [traineeLeaderboard, setTraineeLeaderboard] = useState<TraineeLeaderboardEntry[]>([]);
  const [skillGapDist, setSkillGapDist] = useState<SkillGapDistribution[]>([]);

  // Trainee-level state
  const [traineeSummary, setTraineeSummary] = useState<TraineeSummaryMetrics | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invalidating, setInvalidating] = useState(false);
  const [invalidateMsg, setInvalidateMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);

        if (isOrgViewer) {
          const [dashboard, courses, gaps] = await Promise.all([
            getOrgDashboardApi(),
            getCourseLeaderboardApi(10),
            getSkillGapDistributionApi(),
          ]);
          setOrgMetrics(dashboard);
          setCourseLeaderboard(courses);
          setSkillGapDist(gaps);

          // Trainee leaderboard — admin only
          if (isAdmin) {
            try {
              const tl = await getTraineeLeaderboardApi(10);
              setTraineeLeaderboard(tl);
            } catch {
              // TRAINER gets 403, silently ignore
            }
          }
        }

        if (isTrainee) {
          const summary = await getTraineeSummaryApi();
          setTraineeSummary(summary);
        }
      } catch (err: any) {
        console.error('Analytics load error:', err);
        setError(err?.response?.data?.error?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleInvalidate = async () => {
    try {
      setInvalidating(true);
      setInvalidateMsg(null);
      await invalidateSnapshotApi();
      setInvalidateMsg('Snapshot invalidated! Refreshing...');
      // Reload dashboard
      const dashboard = await getOrgDashboardApi();
      setOrgMetrics(dashboard);
      setInvalidateMsg('Dashboard recomputed from source tables.');
    } catch (err: any) {
      setInvalidateMsg(err?.response?.data?.error?.message || 'Failed to invalidate');
    } finally {
      setInvalidating(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0b090a] text-[#f5f3f4] font-sans selection:bg-[#a4161a] selection:text-white pb-16">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#0b090a]/90 backdrop-blur-md border-b border-[#2b2d42]/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#660708] via-[#a4161a] to-[#e5383b] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-[#a4161a]/30 group-hover:scale-105 transition-transform">
                CC
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-[#e5383b] transition-colors">
                Capacity<span className="text-[#e5383b]">Connect</span>
              </span>
            </Link>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#161a1d] text-[#b1a7a6] border border-[#2b2d42]">
              Stage 10 Analytics
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/my-learning" className="text-sm font-medium text-[#b1a7a6] hover:text-white transition-colors">
              My Learning
            </Link>
            <Link href="/certificates" className="text-sm font-medium text-[#b1a7a6] hover:text-white transition-colors">
              Certificates
            </Link>
            <Link href="/trainer-matching" className="text-sm font-medium text-[#b1a7a6] hover:text-white transition-colors">
              Trainers
            </Link>
            <div className="h-4 w-px bg-[#2b2d42]" />
            <div className="flex items-center gap-2 bg-[#161a1d] px-3 py-1.5 rounded-lg border border-[#2b2d42]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-[#f5f3f4]">{user?.name}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#660708] text-white">
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
          {/* Banner */}
          <div className="bg-gradient-to-r from-[#161a1d] via-[#1a0f12] to-[#660708]/30 rounded-2xl p-8 border border-[#2b2d42] relative overflow-hidden shadow-2xl">
            <div className="absolute right-0 top-0 w-96 h-96 bg-[#a4161a]/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#e5383b] font-bold">
                <span>Deterministic SQL</span>
                <span>•</span>
                <span>Organization-Scoped</span>
                <span>•</span>
                <span>Real-Time</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {isTrainee ? 'My Progress Dashboard' : 'Executive Analytics Dashboard'}
              </h1>
              <p className="text-[#b1a7a6] max-w-2xl text-sm sm:text-base leading-relaxed">
                {isTrainee
                  ? 'Your personal learning metrics, competency progress, and career development overview.'
                  : 'Organization-wide capacity building insights: enrollments, assessments, competencies, trainer sessions, and recommendation analytics.'}
              </p>
              {orgMetrics?.computedAt && (
                <div className="text-[11px] text-[#b1a7a6] font-mono">
                  Data computed: {new Date(orgMetrics.computedAt).toLocaleString()} (15-min cache TTL)
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-[#660708]/40 border border-[#e5383b]/60 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-xs text-[#b1a7a6] hover:text-white">Dismiss</button>
            </div>
          )}

          {/* Invalidate banner */}
          {invalidateMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-sm flex items-center justify-between">
              <span>🔄 {invalidateMsg}</span>
              <button onClick={() => setInvalidateMsg(null)} className="text-xs text-emerald-400 hover:text-white">Dismiss</button>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="p-12 text-center text-[#b1a7a6] bg-[#161a1d]/40 rounded-xl border border-[#2b2d42]">
              <div className="animate-spin w-8 h-8 border-2 border-[#e5383b] border-t-transparent rounded-full mx-auto mb-3" />
              <span>Loading analytics...</span>
            </div>
          ) : (
            <>
              {/* ──────────── ADMIN / TRAINER VIEW ──────────── */}
              {isOrgViewer && orgMetrics && (
                <div className="space-y-8">
                  {/* Admin: invalidate snapshot button */}
                  {isAdmin && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleInvalidate}
                        disabled={invalidating}
                        className="px-4 py-2 text-xs font-bold text-white bg-[#a4161a] hover:bg-[#e5383b] rounded-lg transition-colors disabled:opacity-50"
                      >
                        {invalidating ? 'Invalidating...' : '🔄 Force Recompute Dashboard'}
                      </button>
                    </div>
                  )}

                  {/* KPI Row */}
                  <OrgSummaryBar
                    totalTrainees={orgMetrics.totalTrainees}
                    activeLearnersLast30Days={orgMetrics.activeLearnersLast30Days}
                    certificateCount={orgMetrics.certificateCount}
                    passRate={orgMetrics.assessment.passRate}
                    avgCompletionRate={orgMetrics.enrollment.averageCompletionRate}
                  />

                  {/* Two-column grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <EnrollmentFunnelChart enrollment={orgMetrics.enrollment} />
                    <AssessmentMetricsPanel assessment={orgMetrics.assessment} />
                  </div>

                  {/* Skill gaps */}
                  <TopSkillGapsTable gaps={orgMetrics.competency.topSkillGaps} />
                  <SkillGapHeatmap distribution={skillGapDist} />

                  {/* Two-column: sessions + recommendations */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TrainerSessionPanel sessions={orgMetrics.trainerSessions} />
                    <RecommendationUptakePanel recommendations={orgMetrics.recommendations} />
                  </div>

                  {/* Course leaderboard */}
                  <CourseLeaderboard courses={courseLeaderboard} />

                  {/* Trainee leaderboard — admin only */}
                  {isAdmin && traineeLeaderboard.length > 0 && (
                    <TraineeLeaderboard trainees={traineeLeaderboard} />
                  )}
                </div>
              )}

              {/* ──────────── TRAINEE VIEW ──────────── */}
              {isTrainee && traineeSummary && (
                <div className="space-y-8">
                  <PersonalSummaryBar summary={traineeSummary} />
                  <PersonalProgressPanel />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
