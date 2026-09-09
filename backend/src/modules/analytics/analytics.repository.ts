// =====================================================================
// analytics.repository.ts  — Stage 10 Analytics Repository
// All queries are parameterized and organization-scoped.
// Stage 10 NEVER writes to Stage 0-9 domain tables.
// Only analytics_snapshots is written by this module.
// =====================================================================

import { pool } from '../../config/database';
import {
  EnrollmentSummary,
  AssessmentMetrics,
  CompetencyMetrics,
  TopSkillGap,
  SkillGapDistribution,
  TrainerSessionMetrics,
  RecommendationMetrics,
  CourseLeaderboardEntry,
  TraineeLeaderboardEntry,
  OrgDashboardMetrics,
  TraineeSummaryMetrics,
  AnalyticsSnapshot,
} from './analytics.types';

/** Safe number coercion — never returns NaN or null */
function num(v: any, fallback = 0): number {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

/** Safe percentage: numerator / denominator * 100, or 0 */
function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return parseFloat(((numerator / denominator) * 100).toFixed(2));
}

export class AnalyticsRepository {
  // ──────────────────────────────────────────────────────────
  // 1. Total active TRAINEE count
  // ──────────────────────────────────────────────────────────
  async getTotalTrainees(orgId: string): Promise<number> {
    const res = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM users
       WHERE organization_id = $1
         AND role = 'TRAINEE'
         AND is_active = true`,
      [orgId]
    );
    return num(res.rows[0]?.cnt);
  }

  // ──────────────────────────────────────────────────────────
  // 2. Active learners in the past windowDays days
  // ──────────────────────────────────────────────────────────
  async getActiveLearnersCount(orgId: string, windowDays = 30): Promise<number> {
    const res = await pool.query(
      `SELECT COUNT(DISTINCT lp.trainee_id) AS cnt
       FROM lesson_progress lp
       JOIN course_enrollments ce ON ce.id = lp.enrollment_id
       WHERE ce.organization_id = $1
         AND lp.is_completed = true
         AND lp.completed_at >= NOW() - ($2 || ' days')::INTERVAL`,
      [orgId, windowDays]
    );
    return num(res.rows[0]?.cnt);
  }

  // ──────────────────────────────────────────────────────────
  // 3. Enrollment summary
  // ──────────────────────────────────────────────────────────
  async getEnrollmentSummary(orgId: string): Promise<EnrollmentSummary> {
    const res = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'ENROLLED')     AS enrolled,
         COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')  AS in_progress,
         COUNT(*) FILTER (WHERE status = 'COMPLETED')    AS completed,
         COUNT(*) FILTER (WHERE status = 'DROPPED')      AS dropped,
         COALESCE(
           ROUND(AVG(progress_percentage) FILTER (WHERE status = 'IN_PROGRESS'), 2),
           0
         ) AS avg_completion_rate
       FROM course_enrollments
       WHERE organization_id = $1`,
      [orgId]
    );
    const r = res.rows[0];
    return {
      total: num(r?.total),
      enrolled: num(r?.enrolled),
      inProgress: num(r?.in_progress),
      completed: num(r?.completed),
      dropped: num(r?.dropped),
      averageCompletionRate: num(r?.avg_completion_rate),
    };
  }

  // ──────────────────────────────────────────────────────────
  // 4. Assessment metrics
  // ──────────────────────────────────────────────────────────
  async getAssessmentMetrics(orgId: string): Promise<AssessmentMetrics> {
    const res = await pool.query(
      `SELECT
         COUNT(*) AS total_submissions,
         COUNT(*) FILTER (WHERE status IN ('SUBMITTED') AND passed IS NOT NULL) AS graded,
         COUNT(*) FILTER (WHERE status IN ('SUBMITTED') AND passed = true)      AS passed_count,
         COALESCE(
           ROUND(AVG(score_percentage) FILTER (WHERE status IN ('SUBMITTED') AND score_percentage IS NOT NULL), 2),
           0
         ) AS avg_score
       FROM assessment_submissions
       WHERE organization_id = $1`,
      [orgId]
    );
    const r = res.rows[0];
    const graded = num(r?.graded);
    const passed = num(r?.passed_count);
    return {
      totalSubmissions: num(r?.total_submissions),
      gradedSubmissions: graded,
      passRate: pct(passed, graded),
      averageScore: num(r?.avg_score),
    };
  }

  // ──────────────────────────────────────────────────────────
  // 5. Certificate count
  // ──────────────────────────────────────────────────────────
  async getCertificateCount(orgId: string): Promise<number> {
    const res = await pool.query(
      `SELECT COUNT(*) AS cnt FROM certificates WHERE organization_id = $1`,
      [orgId]
    );
    return num(res.rows[0]?.cnt);
  }

  // ──────────────────────────────────────────────────────────
  // 6. Competency metrics (coverage + top skill gaps)
  // ──────────────────────────────────────────────────────────
  async getCompetencyMetrics(orgId: string, topN = 10): Promise<CompetencyMetrics> {
    // Coverage
    const coverageRes = await pool.query(
      `SELECT
         COUNT(DISTINCT tc.trainee_id) AS measured_trainees,
         (SELECT COUNT(*) FROM users WHERE organization_id = $1 AND role = 'TRAINEE' AND is_active = true) AS total_trainees,
         COUNT(DISTINCT tc.competency_id) AS total_competencies
       FROM trainee_competencies tc
       WHERE tc.organization_id = $1`,
      [orgId]
    );
    const c = coverageRes.rows[0];
    const measuredTrainees = num(c?.measured_trainees);
    const totalTrainees = num(c?.total_trainees);
    const totalCompetencies = num(c?.total_competencies);

    // Top skill gaps
    const gapRes = await pool.query(
      `SELECT
         co.id   AS competency_id,
         co.code AS competency_code,
         co.name AS competency_name,
         COUNT(tc.trainee_id) AS trainee_count,
         ROUND(AVG(tc.gap_percentage), 2) AS avg_gap
       FROM trainee_competencies tc
       JOIN competencies co ON co.id = tc.competency_id
       WHERE tc.organization_id = $1
         AND tc.gap_percentage > 0
       GROUP BY co.id, co.code, co.name
       ORDER BY avg_gap DESC, co.code ASC
       LIMIT $2`,
      [orgId, topN]
    );

    const topSkillGaps: TopSkillGap[] = gapRes.rows.map((r: any) => ({
      competencyId: r.competency_id,
      competencyCode: r.competency_code,
      competencyName: r.competency_name,
      traineeCount: num(r.trainee_count),
      averageGapPercentage: num(r.avg_gap),
    }));

    return {
      coveragePercentage: pct(measuredTrainees, totalTrainees),
      totalCompetencies,
      topSkillGaps,
    };
  }

  // ──────────────────────────────────────────────────────────
  // 7. Skill gap distribution
  // ──────────────────────────────────────────────────────────
  async getSkillGapDistribution(orgId: string): Promise<SkillGapDistribution[]> {
    const res = await pool.query(
      `SELECT
         co.id   AS competency_id,
         co.code AS competency_code,
         co.name AS competency_name,
         CASE
           WHEN tc.gap_percentage = 0               THEN '0'
           WHEN tc.gap_percentage < 25              THEN '1-24.99'
           WHEN tc.gap_percentage < 50              THEN '25-49.99'
           WHEN tc.gap_percentage < 75              THEN '50-74.99'
           ELSE                                          '75-100'
         END AS gap_bucket,
         COUNT(tc.trainee_id) AS trainee_count
       FROM trainee_competencies tc
       JOIN competencies co ON co.id = tc.competency_id
       WHERE tc.organization_id = $1
       GROUP BY co.id, co.code, co.name, gap_bucket
       ORDER BY co.code ASC, gap_bucket ASC`,
      [orgId]
    );
    return res.rows.map((r: any) => ({
      competencyId: r.competency_id,
      competencyCode: r.competency_code,
      competencyName: r.competency_name,
      gapBucket: r.gap_bucket as SkillGapDistribution['gapBucket'],
      traineeCount: num(r.trainee_count),
    }));
  }

  // ──────────────────────────────────────────────────────────
  // 8. Trainer session metrics
  // ──────────────────────────────────────────────────────────
  async getTrainerSessionMetrics(orgId: string): Promise<TrainerSessionMetrics> {
    const res = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'PENDING')   AS pending,
         COUNT(*) FILTER (WHERE status = 'ACCEPTED')  AS accepted,
         COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
         COUNT(*) FILTER (WHERE status = 'DECLINED')  AS declined,
         COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled
       FROM trainer_session_requests
       WHERE organization_id = $1`,
      [orgId]
    );
    const r = res.rows[0];
    const pending   = num(r?.pending);
    const accepted  = num(r?.accepted);
    const completed = num(r?.completed);
    const declined  = num(r?.declined);
    const cancelled = num(r?.cancelled);

    // acceptanceRate = ACCEPTED / (PENDING+ACCEPTED+DECLINED) * 100
    const acceptanceDenom = pending + accepted + declined;
    // completionRate = COMPLETED / (ACCEPTED+COMPLETED+CANCELLED) * 100
    const completionDenom = accepted + completed + cancelled;

    return {
      total: num(r?.total),
      pending,
      accepted,
      completed,
      declined,
      cancelled,
      acceptanceRate: pct(accepted, acceptanceDenom),
      completionRate: pct(completed, completionDenom),
    };
  }

  // ──────────────────────────────────────────────────────────
  // 9. Recommendation uptake
  // ──────────────────────────────────────────────────────────
  async getRecommendationUptake(orgId: string): Promise<RecommendationMetrics> {
    const res = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'ACTIVE')    AS active,
         COUNT(*) FILTER (WHERE status = 'DISMISSED') AS dismissed,
         COUNT(*) FILTER (WHERE status = 'ENROLLED')  AS enrolled
       FROM recommendations
       WHERE organization_id = $1`,
      [orgId]
    );
    const r = res.rows[0];
    const total    = num(r?.total);
    const active   = num(r?.active);
    const dismissed = num(r?.dismissed);
    const enrolled  = num(r?.enrolled);

    return {
      total,
      active,
      dismissed,
      enrolled,
      enrolledRate:  pct(enrolled, total),
      dismissedRate: pct(dismissed, total),
      activeRate:    pct(active, total),
    };
  }

  // ──────────────────────────────────────────────────────────
  // 10. Course leaderboard
  // ──────────────────────────────────────────────────────────
  async getCourseLeaderboard(orgId: string, limit: number): Promise<CourseLeaderboardEntry[]> {
    const res = await pool.query(
      `SELECT
         c.id    AS course_id,
         c.title AS course_title,
         COUNT(ce.id)                                                        AS enrollment_count,
         COUNT(ce.id) FILTER (WHERE ce.status = 'COMPLETED')                AS completion_count,
         COUNT(cert.id)                                                      AS certificate_count
       FROM courses c
       LEFT JOIN course_enrollments ce   ON ce.course_id = c.id AND ce.organization_id = $1
       LEFT JOIN certificates       cert ON cert.course_id = c.id AND cert.organization_id = $1
       WHERE c.organization_id = $1
       GROUP BY c.id, c.title
       ORDER BY completion_count DESC, c.title ASC, c.id ASC
       LIMIT $2`,
      [orgId, limit]
    );
    return res.rows.map((r: any) => {
      const enrollmentCount = num(r.enrollment_count);
      const completionCount = num(r.completion_count);
      return {
        courseId: r.course_id,
        courseTitle: r.course_title,
        completionCount,
        enrollmentCount,
        completionRate: pct(completionCount, enrollmentCount),
        certificateCount: num(r.certificate_count),
      };
    });
  }

  // ──────────────────────────────────────────────────────────
  // 11. Trainee leaderboard — ADMIN ONLY (enforced in route)
  // ──────────────────────────────────────────────────────────
  async getTraineeLeaderboard(orgId: string, limit: number): Promise<TraineeLeaderboardEntry[]> {
    const res = await pool.query(
      `SELECT
         u.id   AS trainee_id,
         CONCAT(u.first_name, ' ', u.last_name) AS trainee_name,
         ROUND(AVG(tc.current_score_percentage), 2) AS avg_score,
         COUNT(tc.competency_id)                     AS competency_count
       FROM users u
       JOIN trainee_competencies tc ON tc.trainee_id = u.id AND tc.organization_id = $1
       WHERE u.organization_id = $1
         AND u.role = 'TRAINEE'
         AND u.is_active = true
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY avg_score DESC, trainee_name ASC, u.id ASC
       LIMIT $2`,
      [orgId, limit]
    );
    return res.rows.map((r: any) => ({
      traineeId: r.trainee_id,
      traineeName: r.trainee_name,
      averageCompetencyScore: num(r.avg_score),
      competencyCount: num(r.competency_count),
    }));
  }

  // ──────────────────────────────────────────────────────────
  // 12. Personal trainee summary
  // ──────────────────────────────────────────────────────────
  async getPersonalSummary(orgId: string, traineeId: string): Promise<TraineeSummaryMetrics> {
    const res = await pool.query(
      `SELECT
         -- Enrollments
         COUNT(ce.id)                                                           AS courses_enrolled,
         COUNT(ce.id) FILTER (WHERE ce.status = 'COMPLETED')                   AS courses_completed,
         -- Certificates
         (SELECT COUNT(*) FROM certificates
          WHERE trainee_id = $2 AND organization_id = $1)                       AS certificates_earned,
         -- Assessments
         COALESCE(
           ROUND((SELECT AVG(score_percentage)
                  FROM assessment_submissions
                  WHERE trainee_id = $2 AND organization_id = $1
                    AND status = 'SUBMITTED' AND score_percentage IS NOT NULL), 2),
           0
         )                                                                      AS avg_assessment_score,
         -- Competencies
         (SELECT COUNT(*) FROM trainee_competencies
          WHERE trainee_id = $2 AND organization_id = $1)                       AS competencies_measured,
         (SELECT COUNT(*) FROM trainee_competencies
          WHERE trainee_id = $2 AND organization_id = $1 AND gap_percentage > 0) AS skill_gap_count,
         -- Trainer sessions
         (SELECT COUNT(*) FROM trainer_session_requests
          WHERE trainee_id = $2 AND organization_id = $1)                       AS trainer_sessions,
         -- Active recommendations
         (SELECT COUNT(*) FROM recommendations
          WHERE trainee_id = $2 AND organization_id = $1 AND status = 'ACTIVE') AS active_recommendations
       FROM course_enrollments ce
       WHERE ce.trainee_id = $2 AND ce.organization_id = $1`,
      [orgId, traineeId]
    );
    const r = res.rows[0] || {};
    return {
      traineeId,
      organizationId: orgId,
      coursesEnrolled: num(r.courses_enrolled),
      coursesCompleted: num(r.courses_completed),
      certificatesEarned: num(r.certificates_earned),
      averageAssessmentScore: num(r.avg_assessment_score),
      competenciesMeasured: num(r.competencies_measured),
      skillGapCount: num(r.skill_gap_count),
      trainerSessions: num(r.trainer_sessions),
      activeRecommendations: num(r.active_recommendations),
    };
  }

  // ──────────────────────────────────────────────────────────
  // 13. Snapshot management
  // ──────────────────────────────────────────────────────────
  async getSnapshot(orgId: string, type: string): Promise<AnalyticsSnapshot | null> {
    const res = await pool.query(
      `SELECT id, organization_id, snapshot_type, payload, computed_at
       FROM analytics_snapshots
       WHERE organization_id = $1 AND snapshot_type = $2`,
      [orgId, type]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      organizationId: r.organization_id,
      snapshotType: r.snapshot_type,
      payload: r.payload,
      computedAt: r.computed_at,
    };
  }

  async upsertSnapshot(orgId: string, type: string, payload: OrgDashboardMetrics): Promise<void> {
    await pool.query(
      `INSERT INTO analytics_snapshots (organization_id, snapshot_type, payload, computed_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (organization_id, snapshot_type)
       DO UPDATE SET payload = EXCLUDED.payload, computed_at = NOW()`,
      [orgId, type, JSON.stringify(payload)]
    );
  }

  async invalidateSnapshot(orgId: string, type: string): Promise<void> {
    await pool.query(
      `DELETE FROM analytics_snapshots
       WHERE organization_id = $1 AND snapshot_type = $2`,
      [orgId, type]
    );
  }
}

export const analyticsRepository = new AnalyticsRepository();
