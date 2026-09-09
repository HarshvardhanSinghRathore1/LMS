import { apiClient, ApiSuccessResponse } from './api';
import {
  OrgDashboardMetrics,
  TraineeSummaryMetrics,
  CourseLeaderboardEntry,
  TraineeLeaderboardEntry,
  SkillGapDistribution,
} from './analytics.types';

// Re-export types for components
export type {
  OrgDashboardMetrics,
  TraineeSummaryMetrics,
  CourseLeaderboardEntry,
  TraineeLeaderboardEntry,
  SkillGapDistribution,
};

// ── Org Dashboard ─────────────────────────────────────────────────────────────
export async function getOrgDashboardApi(): Promise<OrgDashboardMetrics> {
  const res = await apiClient.get<ApiSuccessResponse<OrgDashboardMetrics>>('/analytics/org-dashboard');
  return res.data.data;
}

// ── Trainee Personal Summary ──────────────────────────────────────────────────
export async function getTraineeSummaryApi(): Promise<TraineeSummaryMetrics> {
  const res = await apiClient.get<ApiSuccessResponse<TraineeSummaryMetrics>>('/analytics/trainee-summary');
  return res.data.data;
}

// ── Leaderboards ─────────────────────────────────────────────────────────────
export async function getCourseLeaderboardApi(limit = 10): Promise<CourseLeaderboardEntry[]> {
  const res = await apiClient.get<ApiSuccessResponse<{ leaderboard: CourseLeaderboardEntry[] }>>(
    `/analytics/course-leaderboard?limit=${limit}`
  );
  return res.data.data.leaderboard;
}

export async function getTraineeLeaderboardApi(limit = 10): Promise<TraineeLeaderboardEntry[]> {
  const res = await apiClient.get<ApiSuccessResponse<{ leaderboard: TraineeLeaderboardEntry[] }>>(
    `/analytics/trainee-leaderboard?limit=${limit}`
  );
  return res.data.data.leaderboard;
}

// ── Skill Gap Distribution ────────────────────────────────────────────────────
export async function getSkillGapDistributionApi(): Promise<SkillGapDistribution[]> {
  const res = await apiClient.get<ApiSuccessResponse<{ distribution: SkillGapDistribution[] }>>(
    '/analytics/skill-gap-distribution'
  );
  return res.data.data.distribution;
}

// ── Snapshot Invalidation (Admin only) ───────────────────────────────────────
export async function invalidateSnapshotApi(): Promise<void> {
  await apiClient.post('/analytics/invalidate-snapshot');
}
