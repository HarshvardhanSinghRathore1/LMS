// =====================================================================
// analytics.types.ts  — Stage 10 Analytics Type Definitions
// All numeric fields are non-nullable; nulls are coerced to 0 in service.
// =====================================================================

export interface EnrollmentSummary {
  total: number;
  enrolled: number;
  inProgress: number;
  completed: number;
  dropped: number;
  averageCompletionRate: number; // AVG(progress_percentage) WHERE status='IN_PROGRESS', or 0
}

export interface AssessmentMetrics {
  totalSubmissions: number;
  gradedSubmissions: number;
  passRate: number;       // passed/graded*100 or 0
  averageScore: number;   // AVG(score_percentage) or 0
}

export interface CompetencyMetrics {
  coveragePercentage: number; // distinct trainees with >=1 competency / total active trainees * 100
  totalCompetencies: number;
  topSkillGaps: TopSkillGap[];
}

export interface TopSkillGap {
  competencyId: string;
  competencyCode: string;
  competencyName: string;
  traineeCount: number;
  averageGapPercentage: number;
}

export interface SkillGapDistribution {
  competencyId: string;
  competencyCode: string;
  competencyName: string;
  gapBucket: '0' | '1-24.99' | '25-49.99' | '50-74.99' | '75-100';
  traineeCount: number;
}

export interface TrainerSessionMetrics {
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  declined: number;
  cancelled: number;
  acceptanceRate: number;   // ACCEPTED / (PENDING+ACCEPTED+DECLINED) * 100 or 0
  completionRate: number;   // COMPLETED / (ACCEPTED+COMPLETED+CANCELLED) * 100 or 0
}

export interface RecommendationMetrics {
  total: number;
  active: number;
  dismissed: number;
  enrolled: number;
  enrolledRate: number;   // enrolled / total * 100 or 0
  dismissedRate: number;  // dismissed / total * 100 or 0
  activeRate: number;     // active / total * 100 or 0
}

export interface CourseLeaderboardEntry {
  courseId: string;
  courseTitle: string;
  completionCount: number;
  enrollmentCount: number;
  completionRate: number;   // completionCount / enrollmentCount * 100 or 0
  certificateCount: number;
}

export interface TraineeLeaderboardEntry {
  traineeId: string;
  traineeName: string;
  averageCompetencyScore: number;
  competencyCount: number;
}

export interface OrgDashboardMetrics {
  organizationId: string;
  totalTrainees: number;
  activeLearnersLast30Days: number;
  certificateCount: number;
  enrollment: EnrollmentSummary;
  assessment: AssessmentMetrics;
  competency: CompetencyMetrics;
  trainerSessions: TrainerSessionMetrics;
  recommendations: RecommendationMetrics;
  computedAt: string; // ISO timestamp
}

export interface TraineeSummaryMetrics {
  traineeId: string;
  organizationId: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  certificatesEarned: number;
  averageAssessmentScore: number;
  competenciesMeasured: number;
  skillGapCount: number;
  trainerSessions: number;
  activeRecommendations: number;
}

export interface AnalyticsSnapshot {
  id: string;
  organizationId: string;
  snapshotType: string;
  payload: OrgDashboardMetrics;
  computedAt: Date;
}
