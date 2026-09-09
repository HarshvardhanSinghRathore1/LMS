// =====================================================================
// analytics.service.ts  — Stage 10 Analytics Service
// Orchestrates repository calls, handles snapshot TTL, normalizes nulls.
// NEVER mutates Stage 0-9 domain tables.
// =====================================================================

import { analyticsRepository } from './analytics.repository';
import {
  OrgDashboardMetrics,
  TraineeSummaryMetrics,
  CourseLeaderboardEntry,
  TraineeLeaderboardEntry,
  SkillGapDistribution,
} from './analytics.types';
import { eventDispatcher } from '../../events/eventDispatcher';

const SNAPSHOT_TYPE_ORG_DASHBOARD = 'ORG_DASHBOARD';
const SNAPSHOT_TTL_MINUTES = 15;

function isStale(computedAt: Date): boolean {
  const ageMs = Date.now() - computedAt.getTime();
  return ageMs > SNAPSHOT_TTL_MINUTES * 60 * 1000;
}

export class AnalyticsService {
  // ──────────────────────────────────────────────────────────
  // Full org dashboard (with 15-min snapshot caching)
  // ──────────────────────────────────────────────────────────
  async getOrgDashboard(orgId: string): Promise<OrgDashboardMetrics> {
    // 1. Try snapshot
    const snapshot = await analyticsRepository.getSnapshot(orgId, SNAPSHOT_TYPE_ORG_DASHBOARD);
    if (snapshot && !isStale(snapshot.computedAt)) {
      return snapshot.payload;
    }

    // 2. Recompute — run all queries in parallel for performance
    const [
      totalTrainees,
      activeLearnersLast30Days,
      certificateCount,
      enrollment,
      assessment,
      competency,
      trainerSessions,
      recommendations,
    ] = await Promise.all([
      analyticsRepository.getTotalTrainees(orgId),
      analyticsRepository.getActiveLearnersCount(orgId, 30),
      analyticsRepository.getCertificateCount(orgId),
      analyticsRepository.getEnrollmentSummary(orgId),
      analyticsRepository.getAssessmentMetrics(orgId),
      analyticsRepository.getCompetencyMetrics(orgId, 10),
      analyticsRepository.getTrainerSessionMetrics(orgId),
      analyticsRepository.getRecommendationUptake(orgId),
    ]);

    const metrics: OrgDashboardMetrics = {
      organizationId: orgId,
      totalTrainees,
      activeLearnersLast30Days,
      certificateCount,
      enrollment,
      assessment,
      competency,
      trainerSessions,
      recommendations,
      computedAt: new Date().toISOString(),
    };

    // 3. Upsert snapshot (non-blocking failure — analytics still returns)
    try {
      await analyticsRepository.upsertSnapshot(orgId, SNAPSHOT_TYPE_ORG_DASHBOARD, metrics);
    } catch (err) {
      console.warn('[Analytics] Snapshot upsert failed (non-critical):', err);
    }

    return metrics;
  }

  // ──────────────────────────────────────────────────────────
  // Trainee personal summary (always fresh — no snapshot)
  // ──────────────────────────────────────────────────────────
  async getTraineeSummary(orgId: string, traineeId: string): Promise<TraineeSummaryMetrics> {
    return analyticsRepository.getPersonalSummary(orgId, traineeId);
  }

  // ──────────────────────────────────────────────────────────
  // Course leaderboard (always fresh)
  // ──────────────────────────────────────────────────────────
  async getCourseLeaderboard(orgId: string, limit: number): Promise<CourseLeaderboardEntry[]> {
    return analyticsRepository.getCourseLeaderboard(orgId, limit);
  }

  // ──────────────────────────────────────────────────────────
  // Trainee leaderboard — ADMIN ONLY (enforced in route)
  // ──────────────────────────────────────────────────────────
  async getTraineeLeaderboard(orgId: string, limit: number): Promise<TraineeLeaderboardEntry[]> {
    return analyticsRepository.getTraineeLeaderboard(orgId, limit);
  }

  // ──────────────────────────────────────────────────────────
  // Skill-gap heatmap data
  // ──────────────────────────────────────────────────────────
  async getSkillGapDistribution(orgId: string): Promise<SkillGapDistribution[]> {
    return analyticsRepository.getSkillGapDistribution(orgId);
  }

  // ──────────────────────────────────────────────────────────
  // Snapshot invalidation — ADMIN ONLY (enforced in route)
  // ──────────────────────────────────────────────────────────
  async invalidateSnapshot(
    orgId: string,
    actor?: { id?: string; email?: string; role?: string }
  ): Promise<void> {
    await analyticsRepository.invalidateSnapshot(orgId, SNAPSHOT_TYPE_ORG_DASHBOARD);
    await eventDispatcher.dispatch({
      type: 'SNAPSHOT_INVALIDATED',
      organizationId: orgId,
      actor,
      payload: {
        snapshotType: SNAPSHOT_TYPE_ORG_DASHBOARD,
      },
    });
  }
}

export const analyticsService = new AnalyticsService();
