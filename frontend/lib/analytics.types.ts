// analytics.types.ts — Frontend type definitions for Stage 10
// Mirror of backend analytics.types.ts

export interface EnrollmentSummary {
  total: number;
  enrolled: number;
  inProgress: number;
  completed: number;
  dropped: number;
  averageCompletionRate: number;
}

export interface AssessmentMetrics {
  totalSubmissions: number;
  gradedSubmissions: number;
  passRate: number;
  averageScore: number;
}

export interface TopSkillGap {
  competencyId: string;
  competencyCode: string;
  competencyName: string;
  traineeCount: number;
  averageGapPercentage: number;
}

export interface CompetencyMetrics {
  coveragePercentage: number;
  totalCompetencies: number;
  topSkillGaps: TopSkillGap[];
}

export interface TrainerSessionMetrics {
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  declined: number;
  cancelled: number;
  acceptanceRate: number;
  completionRate: number;
}

export interface RecommendationMetrics {
  total: number;
  active: number;
  dismissed: number;
  enrolled: number;
  enrolledRate: number;
  dismissedRate: number;
  activeRate: number;
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
  computedAt: string;
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

export interface CourseLeaderboardEntry {
  courseId: string;
  courseTitle: string;
  completionCount: number;
  enrollmentCount: number;
  completionRate: number;
  certificateCount: number;
}

export interface TraineeLeaderboardEntry {
  traineeId: string;
  traineeName: string;
  averageCompetencyScore: number;
  competencyCount: number;
}

export interface SkillGapDistribution {
  competencyId: string;
  competencyCode: string;
  competencyName: string;
  gapBucket: '0' | '1-24.99' | '25-49.99' | '50-74.99' | '75-100';
  traineeCount: number;
}
