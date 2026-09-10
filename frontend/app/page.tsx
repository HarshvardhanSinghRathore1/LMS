'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton, CardSkeleton, MetricSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

// API Clients
import { fetchMyEnrollmentsApi, CourseEnrollment } from '../lib/enrollments';
import { fetchMyRecommendationsApi, RecommendationWithDetails } from '../lib/recommendations';
import { fetchMyCompetencyGapsApi, TraineeCompetency } from '../lib/competencies';
import { getMyCertificatesApi, Certificate } from '../lib/certificates';
import { getTraineeSummaryApi, getOrgDashboardApi, TraineeSummaryMetrics, OrgDashboardMetrics } from '../lib/analytics';
import { fetchCoursesApi, Course } from '../lib/courses';
import { getTrainerSessionsApi, SessionRequest } from '../lib/trainerMatching';
import { fetchApiHealth } from '../lib/api';

// Icons
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  CheckSquare,
  Award,
  ShieldCheck,
  Users,
  Bot,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowUpRight,
  Shield,
  Activity,
  Plus,
  Compass,
  FileText,
  Calendar,
  Zap,
} from 'lucide-react';

export default function RootDashboardPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  return (
    <AppShell>
      {isAuthLoading ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <MetricSkeleton count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <CardSkeleton count={2} />
            </div>
            <div>
              <CardSkeleton count={2} />
            </div>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <GuestLandingView />
      ) : user?.role === 'TRAINER' ? (
        <TrainerDashboardView user={user} />
      ) : user?.role === 'ADMIN' ? (
        <AdminDashboardView user={user} />
      ) : (
        <TraineeDashboardView user={user} />
      )}
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TRAINEE DASHBOARD (PRIMARY SHOWCASE)
// ─────────────────────────────────────────────────────────────────────────────

function TraineeDashboardView({ user }: { user: any }) {
  // State hooks with isolated loading & error states
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [isEnrollmentsLoading, setIsEnrollmentsLoading] = useState(true);
  const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null);

  const [recommendations, setRecommendations] = useState<RecommendationWithDetails[]>([]);
  const [isRecsLoading, setIsRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState<string | null>(null);

  const [competencies, setCompetencies] = useState<TraineeCompetency[]>([]);
  const [isCompLoading, setIsCompLoading] = useState(true);
  const [compError, setCompError] = useState<string | null>(null);

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isCertsLoading, setIsCertsLoading] = useState(true);
  const [certsError, setCertsError] = useState<string | null>(null);

  const [summaryMetrics, setSummaryMetrics] = useState<TraineeSummaryMetrics | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Learner';

  // Load trainee data
  const loadTraineeData = async () => {
    // 1. Enrollments
    setIsEnrollmentsLoading(true);
    setEnrollmentsError(null);
    fetchMyEnrollmentsApi()
      .then((res) => setEnrollments(res?.enrollments || []))
      .catch((err) => setEnrollmentsError(err.response?.data?.error?.message || 'Unable to load enrollments'))
      .finally(() => setIsEnrollmentsLoading(false));

    // 2. Recommendations
    setIsRecsLoading(true);
    setRecsError(null);
    fetchMyRecommendationsApi()
      .then((data) => setRecommendations(data || []))
      .catch((err) => setRecsError(err.response?.data?.error?.message || 'Unable to load recommendations'))
      .finally(() => setIsRecsLoading(false));

    // 3. Competencies
    setIsCompLoading(true);
    setCompError(null);
    fetchMyCompetencyGapsApi()
      .then((data) => setCompetencies(data || []))
      .catch((err) => setCompError(err.response?.data?.error?.message || 'Unable to load competency gaps'))
      .finally(() => setIsCompLoading(false));

    // 4. Certificates
    setIsCertsLoading(true);
    setCertsError(null);
    getMyCertificatesApi()
      .then((data) => setCertificates(data || []))
      .catch((err) => setCertsError(err.response?.data?.error?.message || 'Unable to load certificates'))
      .finally(() => setIsCertsLoading(false));

    // 5. Analytics Summary
    setIsMetricsLoading(true);
    getTraineeSummaryApi()
      .then((data) => setSummaryMetrics(data))
      .catch(() => setSummaryMetrics(null))
      .finally(() => setIsMetricsLoading(false));
  };

  useEffect(() => {
    loadTraineeData();
  }, []);

  // Compute active enrollments (IN_PROGRESS or ENROLLED)
  const activeEnrollments = enrollments.filter(
    (e) => e.status === 'IN_PROGRESS' || e.status === 'ENROLLED'
  );
  const completedEnrollments = enrollments.filter((e) => e.status === 'COMPLETED');

  // Compute overall progress %
  const totalCourses = enrollments.length;
  const overallProgressPercentage =
    totalCourses > 0
      ? Math.round(
          enrollments.reduce((sum, e) => sum + (Number(e.progress_percentage) || 0), 0) / totalCourses
        )
      : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── HERO BANNER ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-carbon-black via-[#161a1d] to-dark-garnet/50 dark:from-[#161a1d] dark:via-[#161a1d] dark:to-dark-garnet/40 light:from-white light:via-red-50/40 light:to-white border border-silver/20 dark:border-white/10 light:border-gray-200 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-strawberry-red/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="brand" size="sm">
                TRAINEE LEARNING WORKSPACE
              </Badge>
              <span className="text-xs text-silver dark:text-silver light:text-gray-500 font-medium">
                Continuous Competency Track
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white dark:text-white light:text-gray-900 tracking-tight">
              {getGreeting()}, {displayName} 👋
            </h1>
            <p className="text-sm sm:text-base text-silver dark:text-silver light:text-gray-600 font-medium">
              Continue building your organizational competencies and reach your verified learning goals.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link href="/my-learning">
                <Button variant="brand" size="md" className="gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Continue Learning
                </Button>
              </Link>
              <Link href="/courses">
                <Button variant="secondary" size="md" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Explore Courses
                </Button>
              </Link>
              <Link href="/ai-tools">
                <Button variant="outline" size="md" className="gap-2">
                  <Bot className="w-4 h-4 text-strawberry-red" />
                  Ask AI Tutor
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Progress Overview Box */}
          <div className="bg-onyx/80 dark:bg-[#0b090a]/80 light:bg-white/90 backdrop-blur-md rounded-xl p-5 border border-silver/15 dark:border-white/10 light:border-gray-200 min-w-[260px] space-y-3 shrink-0 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-silver dark:text-silver light:text-gray-500">
                Overall Progress
              </span>
              <span className="text-xs font-mono font-bold text-strawberry-red">
                {overallProgressPercentage}%
              </span>
            </div>
            <ProgressBar value={overallProgressPercentage} size="md" showPercentage={false} />
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-silver/10 light:border-gray-100 text-xs">
              <div>
                <div className="font-bold text-white dark:text-white light:text-gray-900 font-mono">
                  {totalCourses}
                </div>
                <div className="text-[10px] text-silver dark:text-silver light:text-gray-500">Enrolled</div>
              </div>
              <div>
                <div className="font-bold text-emerald-400 light:text-emerald-600 font-mono">
                  {completedEnrollments.length}
                </div>
                <div className="text-[10px] text-silver dark:text-silver light:text-gray-500">Completed</div>
              </div>
              <div>
                <div className="font-bold text-amber-400 light:text-amber-600 font-mono">
                  {activeEnrollments.length}
                </div>
                <div className="text-[10px] text-silver dark:text-silver light:text-gray-500">In Progress</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI METRICS SECTION ────────────────────────────────────────────────── */}
      {isMetricsLoading && !summaryMetrics ? (
        <MetricSkeleton count={5} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          <StatCard
            label="Courses Enrolled"
            value={summaryMetrics?.coursesEnrolled ?? totalCourses}
            subtext={`${activeEnrollments.length} currently active`}
            icon={<BookOpen className="w-4 h-4" />}
            status="neutral"
          />
          <StatCard
            label="Completed"
            value={summaryMetrics?.coursesCompleted ?? completedEnrollments.length}
            subtext="100% finished courses"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            status="success"
          />
          <StatCard
            label="Average Score"
            value={
              summaryMetrics?.averageAssessmentScore !== undefined
                ? `${summaryMetrics.averageAssessmentScore}%`
                : '—'
            }
            subtext="Across assessments"
            icon={<Award className="w-4 h-4 text-amber-400" />}
            status="warning"
          />
          <StatCard
            label="Skill Gaps"
            value={summaryMetrics?.skillGapCount ?? competencies.length}
            subtext="Targeted for growth"
            icon={<TrendingUp className="w-4 h-4 text-strawberry-red" />}
            status="danger"
          />
          <StatCard
            label="Certificates"
            value={summaryMetrics?.certificatesEarned ?? certificates.length}
            subtext="Verified credentials"
            icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
            status="success"
          />
        </div>
      )}

      {/* ── MAIN CONTENT TWO-COLUMN GRID ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN (2 Cols): Continue Learning & Recommendations */}
        <div className="lg:col-span-2 space-y-8">
          {/* SECTION: CONTINUE LEARNING */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white dark:text-white light:text-gray-900 tracking-tight flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-strawberry-red" />
                  Continue Learning
                </h2>
                <p className="text-xs text-silver dark:text-silver light:text-gray-500">
                  Pick up where you left off in your active courses
                </p>
              </div>
              <Link
                href="/my-learning"
                className="text-xs font-semibold text-strawberry-red hover:underline flex items-center gap-1"
              >
                View all ({enrollments.length})
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isEnrollmentsLoading ? (
              <div className="space-y-3">
                <CardSkeleton count={2} />
              </div>
            ) : enrollmentsError ? (
              <ErrorState
                title="Unable to load active courses"
                message={enrollmentsError}
                onRetry={loadTraineeData}
              />
            ) : activeEnrollments.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses in progress"
                description="Start your personalized learning journey by exploring published courses."
                actionText="Explore Course Catalog"
                actionHref="/courses"
              />
            ) : (
              <div className="space-y-3.5">
                {activeEnrollments.slice(0, 3).map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="p-5 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200/90 bg-carbon-black/70 dark:bg-[#161a1d] light:bg-white hover:border-mahogany-red/40 transition-all duration-200 shadow-sm hover:shadow-md space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={enrollment.status === 'COMPLETED' ? 'success' : 'brand'}
                            size="sm"
                          >
                            {enrollment.status.replace('_', ' ')}
                          </Badge>
                          {enrollment.category && (
                            <span className="text-xs text-silver dark:text-silver light:text-gray-500 font-medium">
                              • {enrollment.category}
                            </span>
                          )}
                          {enrollment.difficulty_level && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-carbon-black/60 dark:bg-silver/10 light:bg-gray-100 text-silver dark:text-silver light:text-gray-600 font-mono">
                              {enrollment.difficulty_level}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white dark:text-white light:text-gray-900 tracking-tight">
                          {enrollment.course_title || 'Untitled Course'}
                        </h3>
                      </div>
                      <Link href={`/courses/${enrollment.course_id}`}>
                        <Button variant="brand" size="sm" className="gap-1.5 shrink-0 w-full sm:w-auto">
                          Continue
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-silver/10 light:border-gray-100">
                      <div className="flex items-center justify-between text-xs text-silver dark:text-silver light:text-gray-500">
                        <span>
                          {enrollment.completed_lessons_count || 0} of{' '}
                          {enrollment.total_lessons_count || 0} lessons completed
                        </span>
                        <span className="font-mono font-semibold text-white dark:text-white light:text-gray-900">
                          {Math.round(enrollment.progress_percentage || 0)}%
                        </span>
                      </div>
                      <ProgressBar
                        value={Number(enrollment.progress_percentage) || 0}
                        size="sm"
                        showPercentage={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION: RECOMMENDED FOR YOU */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white dark:text-white light:text-gray-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-strawberry-red" />
                  Recommended For You
                </h2>
                <p className="text-xs text-silver dark:text-silver light:text-gray-500">
                  AI-curated learning pathways matching your assessed skill gaps
                </p>
              </div>
              <Link
                href="/recommendations"
                className="text-xs font-semibold text-strawberry-red hover:underline flex items-center gap-1"
              >
                View Pathways
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isRecsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CardSkeleton count={2} />
              </div>
            ) : recsError ? (
              <ErrorState
                title="Unable to load recommendations"
                message={recsError}
                onRetry={loadTraineeData}
              />
            ) : recommendations.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No active recommendations yet"
                description="Take an assessment or explore competencies to generate adaptive recommendations."
                actionText="View Competencies"
                actionHref="/competencies"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendations.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200 bg-carbon-black/60 dark:bg-[#161a1d] light:bg-white hover:border-mahogany-red/40 transition-all flex flex-col justify-between space-y-3 shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-dark-garnet/40 dark:bg-dark-garnet/30 light:bg-red-50 text-strawberry-red border border-mahogany-red/30">
                          {Math.round(rec.match_score)}% MATCH
                        </span>
                        {rec.gap_percentage_addressed > 0 && (
                          <span className="text-[10px] text-amber-400 light:text-amber-700 font-medium">
                            Closes {Math.round(rec.gap_percentage_addressed)}% gap
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white dark:text-white light:text-gray-900 tracking-tight line-clamp-1">
                        {rec.course_title}
                      </h4>

                      <p className="text-xs text-silver dark:text-silver light:text-gray-600 line-clamp-2">
                        {rec.recommendation_reason || rec.course_description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-silver/10 light:border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-silver/80 dark:text-silver/80 light:text-gray-500 font-medium">
                        {rec.course_difficulty || 'All Levels'}
                      </span>
                      <Link href={`/courses/${rec.course_id}`}>
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3">
                          View Course
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN (1 Col): Skills, Certificates, AI Tutor & Trainer Match */}
        <div className="space-y-6">
          {/* SECTION: SKILL COMPETENCY PROGRESS */}
          <Card
            title={
              <div className="flex items-center gap-2 text-sm font-bold">
                <Award className="w-4 h-4 text-strawberry-red" />
                Your Skill Competencies
              </div>
            }
            subtitle="Real-time proficiency scoring"
            action={
              <Link href="/competencies" className="text-xs text-strawberry-red hover:underline">
                Matrix →
              </Link>
            }
          >
            {isCompLoading ? (
              <div className="space-y-3 py-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : compError ? (
              <ErrorState title="Skills error" message={compError} onRetry={loadTraineeData} />
            ) : competencies.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <Award className="w-8 h-8 text-silver/40 mx-auto" />
                <p className="text-xs text-silver dark:text-silver light:text-gray-500">
                  No competency gaps measured yet. Take assessments to map your skills.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {competencies.slice(0, 4).map((comp) => {
                  const score = Math.round(comp.current_score_percentage || 0);
                  const profVariant =
                    comp.proficiency_level === 'EXPERT'
                      ? 'success'
                      : comp.proficiency_level === 'ADVANCED'
                      ? 'brand'
                      : comp.proficiency_level === 'INTERMEDIATE'
                      ? 'warning'
                      : 'neutral';

                  return (
                    <div key={comp.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white dark:text-white light:text-gray-900 truncate max-w-[140px]">
                          {comp.competency_name || comp.competency_code}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={profVariant} size="sm">
                            {comp.proficiency_level}
                          </Badge>
                          <span className="font-mono font-bold text-white dark:text-white light:text-gray-900">
                            {score}%
                          </span>
                        </div>
                      </div>
                      <ProgressBar value={score} size="sm" showPercentage={false} />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* SECTION: CERTIFICATES & ACHIEVEMENTS */}
          <Card
            title={
              <div className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verified Achievements
              </div>
            }
            subtitle="Cryptographically verified certificates"
            action={
              <Link href="/certificates" className="text-xs text-strawberry-red hover:underline">
                View all →
              </Link>
            }
          >
            {isCertsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : certsError ? (
              <ErrorState title="Certificates error" message={certsError} onRetry={loadTraineeData} />
            ) : certificates.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <ShieldCheck className="w-8 h-8 text-silver/40 mx-auto" />
                <p className="text-xs text-silver dark:text-silver light:text-gray-500">
                  Complete 100% of a published course with passing assessment to earn verified certificates.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {certificates.slice(0, 2).map((cert) => (
                  <div
                    key={cert.id}
                    className="p-3 rounded-lg border border-silver/15 dark:border-white/10 light:border-gray-200 bg-carbon-black/40 dark:bg-[#161a1d]/60 light:bg-gray-50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white dark:text-white light:text-gray-900 truncate">
                        {cert.course_title || 'Course Certificate'}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 light:text-emerald-700 font-bold">
                        {Math.round(cert.final_score_percentage || 100)}% SCORE
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-silver dark:text-silver light:text-gray-500">
                      <span className="font-mono text-[10px]">{cert.certificate_code}</span>
                      <Link
                        href={`/verify-certificate?code=${encodeURIComponent(cert.certificate_code)}`}
                        className="text-strawberry-red hover:underline font-medium"
                      >
                        Verify ↗
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* SECTION: AI LEARNING ASSISTANT ENTRY */}
          <div className="p-5 rounded-xl border border-strawberry-red/30 bg-gradient-to-br from-carbon-black via-dark-garnet/30 to-carbon-black dark:from-[#161a1d] dark:via-dark-garnet/20 dark:to-[#161a1d] light:from-red-50/50 light:to-white space-y-3 shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-strawberry-red/20 text-strawberry-red flex items-center justify-center border border-strawberry-red/40">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white dark:text-white light:text-gray-900">
                AI Learning Assistant
              </h3>
            </div>
            <p className="text-xs text-silver dark:text-silver light:text-gray-600">
              Ask questions about your enrolled courses, clarify complex topics, or practice with AI MCQs.
            </p>
            <Link href="/ai-tools" className="block">
              <Button variant="brand" size="sm" className="w-full gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                Open AI Tutor &amp; Tools →
              </Button>
            </Link>
          </div>

          {/* SECTION: TRAINER MATCHING ENTRY */}
          <div className="p-5 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200 bg-carbon-black/60 dark:bg-[#161a1d] light:bg-white space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 light:text-amber-700 flex items-center justify-center border border-amber-500/30">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white dark:text-white light:text-gray-900">
                Need 1-on-1 Guidance?
              </h3>
            </div>
            <p className="text-xs text-silver dark:text-silver light:text-gray-600">
              Connect with verified trainers specializing in your identified skill gaps.
            </p>
            <Link href="/trainer-matching" className="block">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                Find a Trainer →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TRAINER DASHBOARD VIEW
// ─────────────────────────────────────────────────────────────────────────────

function TrainerDashboardView({ user }: { user: any }) {
  const [orgMetrics, setOrgMetrics] = useState<OrgDashboardMetrics | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<SessionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([
      getOrgDashboardApi(),
      fetchCoursesApi(),
      getTrainerSessionsApi(),
    ]).then(([metricsRes, coursesRes, sessionsRes]) => {
      if (metricsRes.status === 'fulfilled') setOrgMetrics(metricsRes.value);
      if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value?.courses || []);
      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value || []);
      setIsLoading(false);
    });
  }, []);

  const pendingSessions = sessions.filter((s) => s.status === 'PENDING');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-carbon-black via-[#161a1d] to-dark-garnet/40 dark:from-[#161a1d] dark:to-dark-garnet/30 light:from-white light:to-red-50 border border-silver/20 dark:border-white/10 light:border-gray-200 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge variant="warning" size="sm">
              TRAINER DASHBOARD
            </Badge>
            <span className="text-xs text-silver dark:text-silver light:text-gray-500 font-medium">
              Instructor &amp; Assessment Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white dark:text-white light:text-gray-900 tracking-tight">
            Welcome, {user.name || 'Trainer'}
          </h1>
          <p className="text-xs sm:text-sm text-silver dark:text-silver light:text-gray-600">
            Manage course curriculum, review AI-generated materials, and conduct 1-on-1 trainee mentoring sessions.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/courses/create">
              <Button variant="brand" size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Create New Course
              </Button>
            </Link>
            <Link href="/ai-tools">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Sparkles className="w-4 h-4 text-strawberry-red" />
                AI Review Queue
              </Button>
            </Link>
            <Link href="/trainer-matching">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Users className="w-4 h-4" />
                Trainee Sessions ({pendingSessions.length})
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-onyx/80 dark:bg-[#0b090a]/80 light:bg-white/90 p-4 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200 min-w-[220px] space-y-2 shrink-0">
          <div className="text-xs text-silver font-semibold uppercase tracking-wider">Quick Jump</div>
          <div className="space-y-1.5 text-xs">
            <Link href="/courses" className="block text-white hover:text-strawberry-red transition-colors">
              📚 Course Catalog ({courses.length})
            </Link>
            <Link href="/assessments" className="block text-white hover:text-strawberry-red transition-colors">
              ✓ Assessment Bank
            </Link>
            <Link href="/admin/system" className="block text-silver hover:text-strawberry-red transition-colors">
              ⚙️ System &amp; AI Telemetry
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      {isLoading ? (
        <MetricSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Trainees"
            value={orgMetrics?.totalTrainees || '—'}
            subtext="In organization"
            icon={<Users className="w-4 h-4 text-sky-400" />}
            status="info"
          />
          <StatCard
            label="Active Learners"
            value={orgMetrics?.activeLearnersLast30Days || '—'}
            subtext="Last 30 days"
            icon={<Activity className="w-4 h-4 text-emerald-400" />}
            status="success"
          />
          <StatCard
            label="Course Completion"
            value={
              orgMetrics?.enrollment?.averageCompletionRate !== undefined
                ? `${Math.round(orgMetrics.enrollment.averageCompletionRate)}%`
                : '—'
            }
            subtext="Organization average"
            icon={<GraduationCap className="w-4 h-4 text-amber-400" />}
            status="warning"
          />
          <StatCard
            label="Pending Sessions"
            value={pendingSessions.length}
            subtext="Awaiting your response"
            icon={<Clock className="w-4 h-4 text-strawberry-red" />}
            status="danger"
          />
        </div>
      )}

      {/* Two Column Layout: Courses & Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course Management */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white dark:text-white light:text-gray-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-strawberry-red" />
              Published &amp; Managed Courses
            </h2>
            <Link href="/courses" className="text-xs text-strawberry-red hover:underline">
              Manage all →
            </Link>
          </div>

          <div className="space-y-3">
            {courses.slice(0, 4).map((course) => (
              <div
                key={course.id}
                className="p-4 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200 bg-carbon-black/60 dark:bg-[#161a1d] light:bg-white flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        course.status === 'PUBLISHED'
                          ? 'success'
                          : course.status === 'DRAFT'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {course.status}
                    </Badge>
                    <span className="text-xs text-silver truncate">• {course.category}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white dark:text-white light:text-gray-900 truncate">
                    {course.title}
                  </h4>
                </div>
                <Link href={`/courses/${course.id}`}>
                  <Button variant="outline" size="sm" className="text-xs shrink-0">
                    Open
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Sessions & Skill Insights */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white dark:text-white light:text-gray-900 tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Trainee Session Requests
            </h2>
            <Link href="/trainer-matching" className="text-xs text-strawberry-red hover:underline">
              All sessions →
            </Link>
          </div>

          {pendingSessions.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No pending requests"
              description="Trainee mentoring requests will appear here when learners book 1-on-1 sessions."
            />
          ) : (
            <div className="space-y-3">
              {pendingSessions.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-xl border border-amber-800/40 bg-carbon-black/60 dark:bg-[#161a1d] light:bg-amber-50/50 space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white dark:text-white light:text-gray-900">
                      Learner: {session.trainee_name || 'Trainee'}
                    </span>
                    <Badge variant="warning" size="sm">
                      PENDING
                    </Badge>
                  </div>
                  <p className="text-xs text-silver dark:text-silver light:text-gray-600 line-clamp-2">
                    Topic: {session.topic || 'General skill mentoring'}
                  </p>
                  <div className="pt-2 flex justify-end">
                    <Link href="/trainer-matching">
                      <Button variant="brand" size="sm" className="text-xs py-1 px-3">
                        Review Request →
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN DASHBOARD VIEW
// ─────────────────────────────────────────────────────────────────────────────

function AdminDashboardView({ user }: { user: any }) {
  const [metrics, setMetrics] = useState<OrgDashboardMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('connected');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([getOrgDashboardApi(), fetchApiHealth()]).then(([mRes, hRes]) => {
      if (mRes.status === 'fulfilled') setMetrics(mRes.value);
      if (hRes.status === 'fulfilled' && hRes.value.isHealthy) setHealthStatus('healthy');
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-carbon-black via-[#161a1d] to-dark-garnet/40 dark:from-[#161a1d] dark:to-dark-garnet/30 light:from-white light:to-red-50 border border-silver/20 dark:border-white/10 light:border-gray-200 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="sm">
              ADMINISTRATION PORTAL
            </Badge>
            <span className="text-xs text-silver dark:text-silver light:text-gray-500 font-medium">
              Enterprise Overview
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white dark:text-white light:text-gray-900 tracking-tight">
            Organization Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-silver dark:text-silver light:text-gray-600">
            Monitor organizational capacity building, assessment completion rates, skill gaps, and system telemetry.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/analytics">
              <Button variant="brand" size="sm" className="gap-1.5">
                <Activity className="w-4 h-4" />
                Full Analytics Matrix
              </Button>
            </Link>
            <Link href="/admin/audit">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <ShieldCheck className="w-4 h-4 text-strawberry-red" />
                Enterprise Audit Trail
              </Button>
            </Link>
            <Link href="/admin/system">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Zap className="w-4 h-4" />
                System Diagnostics
              </Button>
            </Link>
          </div>
        </div>

        {/* System Health Snapshot Box */}
        <div className="bg-onyx/80 dark:bg-[#0b090a]/80 light:bg-white/90 p-4 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200 min-w-[240px] space-y-2.5 shrink-0 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-silver">System Telemetry</span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="space-y-1 text-xs text-silver">
            <div className="flex justify-between">
              <span>Database (PostgreSQL)</span>
              <span className="font-mono text-white dark:text-white light:text-gray-900">Connected</span>
            </div>
            <div className="flex justify-between">
              <span>AI Provider</span>
              <span className="font-mono text-strawberry-red font-semibold">Active (HF/RAG)</span>
            </div>
            <div className="flex justify-between">
              <span>pgvector Index</span>
              <span className="font-mono text-white dark:text-white light:text-gray-900">384d HNSW</span>
            </div>
          </div>
          <div className="pt-2 border-t border-silver/10">
            <Link
              href="/admin/system"
              className="text-xs text-strawberry-red font-medium hover:underline flex items-center gap-1"
            >
              Open Technical Diagnostics →
            </Link>
          </div>
        </div>
      </div>

      {/* Organization KPIs */}
      {isLoading ? (
        <MetricSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Trainees"
            value={metrics?.totalTrainees || '—'}
            subtext="Registered in organization"
            icon={<Users className="w-4 h-4 text-sky-400" />}
            status="info"
          />
          <StatCard
            label="Active Learners"
            value={metrics?.activeLearnersLast30Days || '—'}
            subtext="Active in last 30 days"
            icon={<Activity className="w-4 h-4 text-emerald-400" />}
            status="success"
          />
          <StatCard
            label="Assessment Pass Rate"
            value={
              metrics?.assessment?.passRate !== undefined
                ? `${Math.round(metrics.assessment.passRate)}%`
                : '—'
            }
            subtext="Automated grading rate"
            icon={<CheckSquare className="w-4 h-4 text-amber-400" />}
            status="warning"
          />
          <StatCard
            label="Certificates Issued"
            value={metrics?.certificateCount || '—'}
            subtext="Verified credentials issued"
            icon={<ShieldCheck className="w-4 h-4 text-strawberry-red" />}
            status="danger"
          />
        </div>
      )}

      {/* Two Column Layout: Quick Actions & Top Skill Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h2 className="text-base font-bold text-white dark:text-white light:text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-strawberry-red" />
            Administration Management Shortcuts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/courses"
              className="p-4 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200 bg-carbon-black/60 dark:bg-[#161a1d] light:bg-white hover:border-mahogany-red/40 transition-all space-y-1 block shadow-sm"
            >
              <div className="font-bold text-sm text-white dark:text-white light:text-gray-900">
                Course Catalog &amp; Builder
              </div>
              <div className="text-xs text-silver dark:text-silver light:text-gray-500">
                Create, review, publish, and archive curriculum.
              </div>
            </Link>
            <Link
              href="/assessments"
              className="p-4 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200 bg-carbon-black/60 dark:bg-[#161a1d] light:bg-white hover:border-mahogany-red/40 transition-all space-y-1 block shadow-sm"
            >
              <div className="font-bold text-sm text-white dark:text-white light:text-gray-900">
                Assessment Management
              </div>
              <div className="text-xs text-silver dark:text-silver light:text-gray-500">
                Question banks, passing thresholds, and grading metrics.
              </div>
            </Link>
            <Link
              href="/admin/audit"
              className="p-4 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200 bg-carbon-black/60 dark:bg-[#161a1d] light:bg-white hover:border-mahogany-red/40 transition-all space-y-1 block shadow-sm"
            >
              <div className="font-bold text-sm text-white dark:text-white light:text-gray-900">
                Enterprise Audit Trail
              </div>
              <div className="text-xs text-silver dark:text-silver light:text-gray-500">
                Inspect security logs, login activity, and administrative actions.
              </div>
            </Link>
            <Link
              href="/admin/system"
              className="p-4 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200 bg-carbon-black/60 dark:bg-[#161a1d] light:bg-white hover:border-mahogany-red/40 transition-all space-y-1 block shadow-sm"
            >
              <div className="font-bold text-sm text-white dark:text-white light:text-gray-900">
                System Diagnostics
              </div>
              <div className="text-xs text-silver dark:text-silver light:text-gray-500">
                pgvector, AI provider configuration, and health telemetry.
              </div>
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white dark:text-white light:text-gray-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Top Identified Skill Gaps
            </h2>
            <Link href="/competencies" className="text-xs text-strawberry-red hover:underline">
              Full Matrix →
            </Link>
          </div>

          <Card>
            {metrics?.competency?.topSkillGaps && metrics.competency.topSkillGaps.length > 0 ? (
              <div className="space-y-3">
                {metrics.competency.topSkillGaps.slice(0, 4).map((gap) => (
                  <div key={gap.competencyId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-white dark:text-white light:text-gray-900">
                        {gap.competencyName}
                      </span>
                      <span className="font-mono text-strawberry-red font-bold">
                        {Math.round(gap.averageGapPercentage)}% avg gap ({gap.traineeCount} learners)
                      </span>
                    </div>
                    <ProgressBar
                      value={Math.round(gap.averageGapPercentage)}
                      size="sm"
                      variant="warning"
                      showPercentage={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-silver text-center py-4">
                No major organization skill gaps identified yet.
              </p>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GUEST / UNAUTHENTICATED LANDING VIEW
// ─────────────────────────────────────────────────────────────────────────────

function GuestLandingView() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCoursesApi().then((res) => setCourses(res?.courses || []));
  }, []);

  return (
    <div className="space-y-16 py-6 animate-in fade-in duration-300">
      {/* Hero */}
      <div className="text-center space-y-6 max-w-3xl mx-auto pt-6 sm:pt-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-garnet/40 dark:bg-dark-garnet/30 light:bg-red-50 text-strawberry-red border border-mahogany-red/30 text-xs font-bold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          Smart Education &bull; SIH 2026 PS 26075
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white dark:text-white light:text-gray-900 tracking-tight leading-tight">
          Build Skills. Measure Progress.{' '}
          <span className="bg-gradient-to-r from-strawberry-red to-mahogany-red bg-clip-text text-transparent">
            Reach Your Potential.
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-silver dark:text-silver light:text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Capacity Connect is an AI-powered organizational capacity-building and Learning Management Platform that connects Trainees, Trainers, and Administrators in a continuous competency loop.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/register">
            <Button variant="brand" size="lg" className="gap-2 text-sm sm:text-base px-6">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="text-sm sm:text-base px-6">
              Sign In to Account
            </Button>
          </Link>
        </div>
      </div>

      {/* Continuous Competency Loop Architecture Diagram */}
      <div className="p-8 rounded-2xl bg-carbon-black dark:bg-[#161a1d] light:bg-white border border-silver/15 dark:border-white/10 light:border-gray-200 shadow-xl space-y-6">
        <div className="text-center space-y-1.5">
          <Badge variant="brand" size="sm">
            THE CAPACITY CONNECT COMPETENCY ENGINE
          </Badge>
          <h2 className="text-xl sm:text-2xl font-bold text-white dark:text-white light:text-gray-900">
            A Continuous Competency Development Loop
          </h2>
          <p className="text-xs sm:text-sm text-silver dark:text-silver light:text-gray-600 max-w-xl mx-auto">
            Unlike generic LMS platforms with simple chatbots, Capacity Connect closes skill gaps through active measurement and personalized intervention.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center text-xs font-semibold">
          {[
            { step: '1', title: 'LEARN', desc: 'Modular Courses' },
            { step: '2', title: 'ASSESS', desc: 'Automated Quizzes' },
            { step: '3', title: 'MEASURE', desc: 'Competency Engine' },
            { step: '4', title: 'IDENTIFY', desc: 'Skill Gap Matrix' },
            { step: '5', title: 'RECOMMEND', desc: 'AI Pathways' },
            { step: '6', title: 'CONNECT', desc: 'Expert Trainers' },
            { step: '7', title: 'IMPROVE', desc: 'Verified Certs' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-onyx dark:bg-[#0b090a] light:bg-gray-50 border border-silver/10 light:border-gray-200 space-y-1 relative"
            >
              <span className="text-[10px] font-mono font-bold text-strawberry-red">
                STAGE {item.step}
              </span>
              <div className="font-bold text-white dark:text-white light:text-gray-900 text-xs sm:text-sm">
                {item.title}
              </div>
              <div className="text-[10px] text-silver dark:text-silver light:text-gray-500">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Courses Preview */}
      {courses.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white dark:text-white light:text-gray-900">
                Explore Available Courses
              </h3>
              <p className="text-xs text-silver dark:text-silver light:text-gray-500">
                Curated curriculum designed for digital capacity building
              </p>
            </div>
            <Link href="/courses">
              <Button variant="outline" size="sm">
                View Full Catalog →
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((course) => (
              <div
                key={course.id}
                className="p-5 rounded-xl border border-silver/15 dark:border-white/10 light:border-gray-200 bg-carbon-black/60 dark:bg-[#161a1d] light:bg-white flex flex-col justify-between space-y-4 shadow-md"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand" size="sm">
                      {course.difficulty_level || 'INTERMEDIATE'}
                    </Badge>
                    <span className="text-xs text-silver dark:text-silver light:text-gray-500">• {course.category}</span>
                  </div>
                  <h4 className="text-base font-bold text-white dark:text-white light:text-gray-900">
                    {course.title}
                  </h4>
                  <p className="text-xs text-silver dark:text-silver light:text-gray-600 line-clamp-2">
                    {course.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-silver/10 light:border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-silver dark:text-silver light:text-gray-500">
                    {course.creator_name || 'Certified Instructor'}
                  </span>
                  <Link href={`/courses/${course.id}`}>
                    <Button variant="secondary" size="sm" className="text-xs">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
