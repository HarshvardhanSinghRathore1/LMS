import { pool } from '../../config/database';
import {
  RecommendationRecord,
  RecommendationWithDetails,
  CandidateCompetency,
} from './recommendation.types';

export class RecommendationRepository {
  /**
   * Fetch evaluated competency records for a trainee within an organization
   */
  async findTraineeEvaluatedCompetencies(
    traineeId: string,
    organizationId: string
  ): Promise<CandidateCompetency[]> {
    const query = `
      SELECT 
        tc.competency_id as "competencyId",
        c.code,
        c.name,
        c.target_score_percentage as "targetScorePercentage",
        tc.current_score_percentage as "currentScorePercentage",
        tc.gap_percentage as "gapPercentage"
      FROM trainee_competencies tc
      JOIN competencies c ON tc.competency_id = c.id
      WHERE tc.trainee_id = $1 
        AND tc.organization_id = $2 
        AND c.organization_id = $2;
    `;
    const result = await pool.query(query, [traineeId, organizationId]);
    return result.rows.map((row) => ({
      competencyId: row.competencyId,
      code: row.code,
      name: row.name,
      weight: 1.0, // Default weight before course mapping
      targetScorePercentage: Number(row.targetScorePercentage),
      currentScorePercentage: Number(row.currentScorePercentage),
      gapPercentage: Number(row.gapPercentage),
    }));
  }

  /**
   * Find eligible candidate courses for recommendation
   * Excludes courses where trainee is ENROLLED, IN_PROGRESS, or COMPLETED
   * Allows DROPPED courses or courses with no active enrollment
   */
  async findEligibleCandidateCourses(
    traineeId: string,
    organizationId: string
  ): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      category: string;
      difficulty_level: string;
      organization_id: string;
      status: string;
    }>
  > {
    const query = `
      SELECT c.id, c.title, c.description, c.category, c.difficulty_level, c.organization_id, c.status
      FROM courses c
      WHERE c.organization_id = $1
        AND c.status = 'PUBLISHED'
        AND NOT EXISTS (
          SELECT 1 FROM course_enrollments e
          WHERE e.course_id = c.id
            AND e.trainee_id = $2
            AND e.organization_id = $1
            AND e.status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED')
        )
      ORDER BY c.title ASC, c.id ASC;
    `;
    const result = await pool.query(query, [organizationId, traineeId]);
    return result.rows;
  }

  /**
   * Find course competency mappings for a set of candidate courses
   */
  async findCourseCompetencyMappings(
    courseIds: string[],
    organizationId: string
  ): Promise<
    Array<{
      course_id: string;
      competency_id: string;
      code: string;
      name: string;
      weight: number;
      target_score_percentage: number;
    }>
  > {
    if (courseIds.length === 0) return [];
    const query = `
      SELECT 
        cc.course_id,
        cc.competency_id,
        c.code,
        c.name,
        cc.weight,
        c.target_score_percentage
      FROM course_competencies cc
      JOIN competencies c ON cc.competency_id = c.id
      WHERE cc.course_id = ANY($1)
        AND cc.organization_id = $2
        AND c.organization_id = $2;
    `;
    const result = await pool.query(query, [courseIds, organizationId]);
    return result.rows.map((row) => ({
      course_id: row.course_id,
      competency_id: row.competency_id,
      code: row.code,
      name: row.name,
      weight: Number(row.weight),
      target_score_percentage: Number(row.target_score_percentage),
    }));
  }

  /**
   * Get organization-scoped course completion metrics
   */
  async getCourseCompletionRates(
    organizationId: string
  ): Promise<Map<string, { completedCount: number; totalCount: number }>> {
    const query = `
      SELECT
        course_id,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as completed_count,
        COUNT(*)::int as total_count
      FROM course_enrollments
      WHERE organization_id = $1
      GROUP BY course_id;
    `;
    const result = await pool.query(query, [organizationId]);
    const metricsMap = new Map<string, { completedCount: number; totalCount: number }>();
    for (const row of result.rows) {
      metricsMap.set(row.course_id, {
        completedCount: row.completed_count,
        totalCount: row.total_count,
      });
    }
    return metricsMap;
  }

  /**
   * Lifecycle-preserving upsert: Refresh ACTIVE recommendations, never resurrect DISMISSED or ENROLLED
   */
  async upsertRecommendation(
    data: {
      organizationId: string;
      traineeId: string;
      courseId: string;
      competencyId: string | null;
      matchScore: number;
      gapPercentageAddressed: number;
      recommendationReason: string;
      recommendationType: string;
    },
    executor: any = pool
  ): Promise<RecommendationRecord | null> {
    const query = `
      INSERT INTO recommendations (
        organization_id,
        trainee_id,
        course_id,
        competency_id,
        match_score,
        gap_percentage_addressed,
        recommendation_reason,
        recommendation_type,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (trainee_id, course_id)
      DO UPDATE SET
        competency_id = EXCLUDED.competency_id,
        match_score = EXCLUDED.match_score,
        gap_percentage_addressed = EXCLUDED.gap_percentage_addressed,
        recommendation_reason = EXCLUDED.recommendation_reason,
        recommendation_type = EXCLUDED.recommendation_type,
        updated_at = CURRENT_TIMESTAMP
      WHERE recommendations.status = 'ACTIVE'
      RETURNING *;
    `;
    const values = [
      data.organizationId,
      data.traineeId,
      data.courseId,
      data.competencyId,
      data.matchScore,
      data.gapPercentageAddressed,
      data.recommendationReason,
      data.recommendationType,
    ];
    const result = await executor.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Find active recommendations for a trainee with course and competency details
   * Sorted deterministically: match_score DESC, gap_percentage_addressed DESC, course.title ASC, course.id ASC
   */
  async findActiveRecommendationsForTrainee(
    traineeId: string,
    organizationId: string
  ): Promise<RecommendationWithDetails[]> {
    const query = `
      SELECT 
        r.*,
        c.title as course_title,
        c.description as course_description,
        c.category as course_category,
        c.difficulty_level as course_difficulty,
        comp.code as competency_code,
        comp.name as competency_name
      FROM recommendations r
      JOIN courses c ON r.course_id = c.id
      LEFT JOIN competencies comp ON r.competency_id = comp.id
      WHERE r.trainee_id = $1 
        AND r.organization_id = $2 
        AND r.status = 'ACTIVE'
      ORDER BY r.match_score DESC, r.gap_percentage_addressed DESC, c.title ASC, c.id ASC;
    `;
    const result = await pool.query(query, [traineeId, organizationId]);
    return result.rows.map((row) => ({
      ...row,
      match_score: Number(row.match_score),
      gap_percentage_addressed: Number(row.gap_percentage_addressed),
    }));
  }

  /**
   * Find recommendation by ID for a trainee within organization
   */
  async findRecommendationById(
    recommendationId: string,
    traineeId: string,
    organizationId: string
  ): Promise<RecommendationRecord | null> {
    const query = `
      SELECT * FROM recommendations
      WHERE id = $1 AND trainee_id = $2 AND organization_id = $3;
    `;
    const result = await pool.query(query, [recommendationId, traineeId, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * Transition active recommendation to DISMISSED
   */
  async dismissRecommendation(
    recommendationId: string,
    traineeId: string,
    organizationId: string
  ): Promise<RecommendationRecord | null> {
    const query = `
      UPDATE recommendations
      SET status = 'DISMISSED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND trainee_id = $2 AND organization_id = $3 AND status = 'ACTIVE'
      RETURNING *;
    `;
    const result = await pool.query(query, [recommendationId, traineeId, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * Lock recommendation row for transactional accept operation
   */
  async findRecommendationForAcceptLock(
    recommendationId: string,
    traineeId: string,
    organizationId: string,
    client: any
  ): Promise<RecommendationRecord | null> {
    const query = `
      SELECT * FROM recommendations
      WHERE id = $1 AND trainee_id = $2 AND organization_id = $3
      FOR UPDATE;
    `;
    const result = await client.query(query, [recommendationId, traineeId, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * Mark recommendation as ENROLLED within a transaction
   */
  async markRecommendationEnrolled(
    recommendationId: string,
    client: any
  ): Promise<RecommendationRecord> {
    const query = `
      UPDATE recommendations
      SET status = 'ENROLLED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;
    const result = await client.query(query, [recommendationId]);
    return result.rows[0];
  }

  /**
   * Fetch course module, lesson, and assessment data for adaptive pathway
   */
  async getCoursePathwayData(
    courseId: string,
    traineeId: string,
    organizationId: string
  ): Promise<{
    course: any;
    modules: any[];
    lessons: any[];
    lessonProgress: any[];
    assessments: any[];
    assessmentSubmissions: any[];
  }> {
    // 1. Course validation
    const courseResult = await pool.query(
      `SELECT id, title, description, status, organization_id FROM courses WHERE id = $1 AND organization_id = $2;`,
      [courseId, organizationId]
    );
    const course = courseResult.rows[0];
    if (!course) {
      return {
        course: null,
        modules: [],
        lessons: [],
        lessonProgress: [],
        assessments: [],
        assessmentSubmissions: [],
      };
    }

    // 2. Modules
    const modulesResult = await pool.query(
      `SELECT id, title, description, order_index FROM course_modules WHERE course_id = $1 ORDER BY order_index ASC;`,
      [courseId]
    );
    const modules = modulesResult.rows;

    // 3. Lessons
    const lessonsResult = await pool.query(
      `SELECT l.id, l.module_id, l.title, l.order_index
       FROM course_lessons l
       JOIN course_modules m ON l.module_id = m.id
       WHERE m.course_id = $1
       ORDER BY m.order_index ASC, l.order_index ASC;`,
      [courseId]
    );
    const lessons = lessonsResult.rows;

    // 4. Lesson Progress
    const progressResult = await pool.query(
      `SELECT lp.lesson_id, lp.is_completed
       FROM lesson_progress lp
       JOIN course_enrollments e ON lp.enrollment_id = e.id
       WHERE e.course_id = $1 AND e.trainee_id = $2 AND e.organization_id = $3;`,
      [courseId, traineeId, organizationId]
    );
    const lessonProgress = progressResult.rows;

    // 5. Assessments
    const assessmentsResult = await pool.query(
      `SELECT id, title, passing_score_percentage FROM assessments WHERE course_id = $1 AND organization_id = $2 ORDER BY title ASC, id ASC;`,
      [courseId, organizationId]
    );
    const assessments = assessmentsResult.rows;

    // 6. Assessment Submissions
    const submissionsResult = await pool.query(
      `SELECT assessment_id, score_percentage, passed
       FROM assessment_submissions
       WHERE trainee_id = $1 AND organization_id = $2;`,
      [traineeId, organizationId]
    );
    const assessmentSubmissions = submissionsResult.rows;

    return {
      course,
      modules,
      lessons,
      lessonProgress,
      assessments,
      assessmentSubmissions,
    };
  }
}

export const recommendationRepository = new RecommendationRepository();
