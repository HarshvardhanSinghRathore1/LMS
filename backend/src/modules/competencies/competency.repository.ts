import { pool } from '../../config/database';
import { PoolClient } from 'pg';
import {
  CompetencyRecord,
  CourseCompetencyRecord,
  TraineeCompetencyRecord,
  OrganizationSkillGapMatrix,
  ProficiencyLevel,
} from './competency.types';

export class CompetencyRepository {
  /**
   * Create a new competency
   */
  async createCompetency(data: {
    organizationId: string;
    code: string;
    name: string;
    description: string;
    category: string;
    targetScorePercentage: number;
  }): Promise<CompetencyRecord> {
    const query = `
      INSERT INTO competencies (
        organization_id, code, name, description, category, target_score_percentage
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await pool.query<CompetencyRecord>(query, [
      data.organizationId,
      data.code,
      data.name,
      data.description,
      data.category,
      data.targetScorePercentage,
    ]);
    return result.rows[0];
  }

  /**
   * Find competency by ID and organization
   */
  async findCompetencyById(
    competencyId: string,
    organizationId: string
  ): Promise<CompetencyRecord | null> {
    const query = `
      SELECT c.*,
             (SELECT COUNT(*)::int FROM course_competencies cc WHERE cc.competency_id = c.id) as mapped_courses_count
      FROM competencies c
      WHERE c.id = $1 AND c.organization_id = $2;
    `;
    const result = await pool.query<CompetencyRecord>(query, [competencyId, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * Find competency by code and organization
   */
  async findCompetencyByCode(
    code: string,
    organizationId: string
  ): Promise<CompetencyRecord | null> {
    const query = `
      SELECT * FROM competencies
      WHERE UPPER(code) = UPPER($1) AND organization_id = $2;
    `;
    const result = await pool.query<CompetencyRecord>(query, [code, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * List competencies for organization
   */
  async listCompetencies(
    organizationId: string,
    options: { category?: string; page: number; limit: number }
  ): Promise<{ competencies: CompetencyRecord[]; total: number }> {
    const offset = (options.page - 1) * options.limit;
    const params: any[] = [organizationId];
    let whereClause = 'WHERE c.organization_id = $1';

    if (options.category) {
      params.push(options.category);
      whereClause += ` AND c.category = $${params.length}`;
    }

    const countQuery = `SELECT COUNT(*)::int as total FROM competencies c ${whereClause};`;
    const countResult = await pool.query<{ total: number }>(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    params.push(options.limit, offset);
    const dataQuery = `
      SELECT c.*,
             (SELECT COUNT(*)::int FROM course_competencies cc WHERE cc.competency_id = c.id) as mapped_courses_count
      FROM competencies c
      ${whereClause}
      ORDER BY c.code ASC
      LIMIT $${params.length - 1} OFFSET $${params.length};
    `;
    const dataResult = await pool.query<CompetencyRecord>(dataQuery, params);
    return { competencies: dataResult.rows, total };
  }

  /**
   * Update competency
   */
  async updateCompetency(
    competencyId: string,
    organizationId: string,
    updates: {
      code?: string;
      name?: string;
      description?: string;
      category?: string;
      targetScorePercentage?: number;
    }
  ): Promise<CompetencyRecord | null> {
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [competencyId, organizationId];
    let index = 3;

    if (updates.code !== undefined) {
      fields.push(`code = $${index++}`);
      values.push(updates.code);
    }
    if (updates.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(updates.description);
    }
    if (updates.category !== undefined) {
      fields.push(`category = $${index++}`);
      values.push(updates.category);
    }
    if (updates.targetScorePercentage !== undefined) {
      fields.push(`target_score_percentage = $${index++}`);
      values.push(updates.targetScorePercentage);
    }

    const query = `
      UPDATE competencies
      SET ${fields.join(', ')}
      WHERE id = $1 AND organization_id = $2
      RETURNING *;
    `;
    const result = await pool.query<CompetencyRecord>(query, values);
    return result.rows[0] || null;
  }

  /**
   * Map competency to course (verifying both belong to organization)
   */
  async mapCourseToCompetency(data: {
    organizationId: string;
    competencyId: string;
    courseId: string;
    weight: number;
  }): Promise<CourseCompetencyRecord> {
    const query = `
      INSERT INTO course_competencies (
        organization_id, course_id, competency_id, weight
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query<CourseCompetencyRecord>(query, [
      data.organizationId,
      data.courseId,
      data.competencyId,
      data.weight,
    ]);
    return result.rows[0];
  }

  /**
   * Remove course-competency mapping
   */
  async removeCourseMapping(
    competencyId: string,
    courseId: string,
    organizationId: string
  ): Promise<boolean> {
    const query = `
      DELETE FROM course_competencies
      WHERE competency_id = $1 AND course_id = $2 AND organization_id = $3;
    `;
    const result = await pool.query(query, [competencyId, courseId, organizationId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * List course mappings for a competency
   */
  async listCourseMappingsForCompetency(
    competencyId: string,
    organizationId: string
  ): Promise<CourseCompetencyRecord[]> {
    const query = `
      SELECT cc.*, c.title as course_title
      FROM course_competencies cc
      JOIN courses c ON cc.course_id = c.id
      WHERE cc.competency_id = $1 AND cc.organization_id = $2;
    `;
    const result = await pool.query<CourseCompetencyRecord>(query, [competencyId, organizationId]);
    return result.rows;
  }

  /**
   * List competencies mapped to a course
   */
  async listCompetenciesMappedToCourse(
    courseId: string,
    organizationId: string,
    client?: PoolClient
  ): Promise<(CourseCompetencyRecord & { competency_code: string; competency_name: string; target_score_percentage: number })[]> {
    const query = `
      SELECT cc.*, c.code as competency_code, c.name as competency_name, c.target_score_percentage
      FROM course_competencies cc
      JOIN competencies c ON cc.competency_id = c.id
      WHERE cc.course_id = $1 AND cc.organization_id = $2;
    `;
    const executor = client || pool;
    const result = await executor.query<CourseCompetencyRecord & { competency_code: string; competency_name: string; target_score_percentage: number }>(query, [courseId, organizationId]);
    return result.rows;
  }

  /**
   * Get all courses mapped to a specific competency (with weights)
   */
  async getCoursesMappedToCompetency(
    competencyId: string,
    organizationId: string,
    client?: PoolClient
  ): Promise<{ course_id: string; weight: number }[]> {
    const query = `
      SELECT course_id, weight
      FROM course_competencies
      WHERE competency_id = $1 AND organization_id = $2;
    `;
    const executor = client || pool;
    const result = await executor.query<{ course_id: string; weight: number }>(query, [
      competencyId,
      organizationId,
    ]);
    return result.rows.map((r: { course_id: string; weight: number }) => ({ course_id: r.course_id, weight: Number(r.weight) }));
  }

  /**
   * Load course performance components for a trainee (assessment score & lesson progress)
   */
  async getCourseScoresForTrainee(
    clientOrPool: PoolClient | typeof pool,
    traineeId: string,
    courseId: string,
    organizationId: string
  ): Promise<{ assessmentScore: number | null; lessonProgress: number | null }> {
    // 1. Assessment Component: Average of latest submitted attempt scores for published assessments in course
    const assQuery = `
      SELECT a.id,
        (
          SELECT s.score_percentage
          FROM assessment_submissions s
          WHERE s.assessment_id = a.id AND s.trainee_id = $1 AND s.organization_id = $3 AND s.status = 'SUBMITTED'
          ORDER BY s.created_at DESC
          LIMIT 1
        ) as latest_score
      FROM assessments a
      WHERE a.course_id = $2 AND a.organization_id = $3 AND a.status = 'PUBLISHED';
    `;
    const assResult = await clientOrPool.query<{ id: string; latest_score: number | null }>(
      assQuery,
      [traineeId, courseId, organizationId]
    );

    const validScores = assResult.rows
      .map((r: { id: string; latest_score: number | null }) => (r.latest_score !== null ? Number(r.latest_score) : null))
      .filter((s: number | null): s is number => s !== null);

    let assessmentScore: number | null = null;
    if (validScores.length > 0) {
      const sum = validScores.reduce((acc: number, curr: number) => acc + curr, 0);
      assessmentScore = sum / validScores.length;
    }

    // 2. Lesson Progress Component
    const progQuery = `
      SELECT progress_percentage
      FROM course_enrollments
      WHERE course_id = $1 AND trainee_id = $2 AND organization_id = $3 AND status != 'DROPPED';
    `;
    const progResult = await clientOrPool.query<{ progress_percentage: number }>(progQuery, [
      courseId,
      traineeId,
      organizationId,
    ]);

    let lessonProgress: number | null = null;
    if (progResult.rows.length > 0 && progResult.rows[0].progress_percentage !== undefined) {
      lessonProgress = Number(progResult.rows[0].progress_percentage);
    }

    return { assessmentScore, lessonProgress };
  }

  /**
   * Upsert trainee competency snapshot
   */
  async upsertTraineeCompetency(
    clientOrPool: PoolClient | typeof pool,
    data: {
      organizationId: string;
      traineeId: string;
      competencyId: string;
      currentScorePercentage: number;
      proficiencyLevel: ProficiencyLevel;
      gapPercentage: number;
    }
  ): Promise<TraineeCompetencyRecord> {
    const query = `
      INSERT INTO trainee_competencies (
        organization_id, trainee_id, competency_id, current_score_percentage,
        proficiency_level, gap_percentage, last_evaluated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (trainee_id, competency_id)
      DO UPDATE SET
        current_score_percentage = EXCLUDED.current_score_percentage,
        proficiency_level = EXCLUDED.proficiency_level,
        gap_percentage = EXCLUDED.gap_percentage,
        last_evaluated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const result = await clientOrPool.query<TraineeCompetencyRecord>(query, [
      data.organizationId,
      data.traineeId,
      data.competencyId,
      data.currentScorePercentage,
      data.proficiencyLevel,
      data.gapPercentage,
    ]);
    return result.rows[0];
  }

  /**
   * Get evaluated competencies for a specific trainee
   */
  async findTraineeCompetencies(
    traineeId: string,
    organizationId: string
  ): Promise<TraineeCompetencyRecord[]> {
    const query = `
      SELECT tc.*, c.code as competency_code, c.name as competency_name,
             c.target_score_percentage, c.category
      FROM trainee_competencies tc
      JOIN competencies c ON tc.competency_id = c.id
      WHERE tc.trainee_id = $1 AND tc.organization_id = $2
      ORDER BY c.code ASC;
    `;
    const result = await pool.query<TraineeCompetencyRecord>(query, [traineeId, organizationId]);
    return result.rows;
  }

  /**
   * Get organization-wide Skill Gap Matrix for Admin and Trainer
   */
  async getOrganizationSkillGapMatrix(
    organizationId: string
  ): Promise<OrganizationSkillGapMatrix> {
    // 1. Fetch Organization Competencies
    const compQuery = `
      SELECT id, code, name, target_score_percentage as "targetScorePercentage", category
      FROM competencies
      WHERE organization_id = $1
      ORDER BY code ASC;
    `;
    const compResult = await pool.query<{
      id: string;
      code: string;
      name: string;
      targetScorePercentage: number;
      category: string;
    }>(compQuery, [organizationId]);
    const competencies = compResult.rows.map((c: { id: string; code: string; name: string; targetScorePercentage: number; category: string }) => ({
      ...c,
      targetScorePercentage: Number(c.targetScorePercentage),
    }));

    // 2. Fetch All Trainees with evaluated competencies in organization
    const traineeQuery = `
      SELECT DISTINCT u.id, TRIM(CONCAT(u.first_name, ' ', u.last_name)) as name, u.email
      FROM users u
      JOIN trainee_competencies tc ON tc.trainee_id = u.id
      WHERE u.organization_id = $1 AND u.role = 'TRAINEE'
      ORDER BY name ASC;
    `;
    const traineeResult = await pool.query<{ id: string; name: string; email: string }>(
      traineeQuery,
      [organizationId]
    );

    // 3. Fetch all evaluated snapshot rows for organization
    const snapQuery = `
      SELECT tc.trainee_id, tc.competency_id, tc.current_score_percentage, tc.proficiency_level, tc.gap_percentage
      FROM trainee_competencies tc
      WHERE tc.organization_id = $1;
    `;
    const snapResult = await pool.query<{
      trainee_id: string;
      competency_id: string;
      current_score_percentage: number;
      proficiency_level: ProficiencyLevel;
      gap_percentage: number;
    }>(snapQuery, [organizationId]);

    const snapshotMap: Record<
      string,
      Record<string, { currentScore: number; proficiency: ProficiencyLevel; gap: number }>
    > = {};

    snapResult.rows.forEach((row: { trainee_id: string; competency_id: string; current_score_percentage: number; proficiency_level: ProficiencyLevel; gap_percentage: number }) => {
      if (!snapshotMap[row.trainee_id]) snapshotMap[row.trainee_id] = {};
      snapshotMap[row.trainee_id][row.competency_id] = {
        currentScore: Number(row.current_score_percentage),
        proficiency: row.proficiency_level,
        gap: Number(row.gap_percentage),
      };
    });

    const trainees = traineeResult.rows.map((t: { id: string; name: string; email: string }) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      competencies: snapshotMap[t.id] || {},
    }));

    // 4. Summary metrics
    let totalGaps = 0;
    let gapCount = 0;
    let noviceCount = 0;
    let intermediateCount = 0;
    let advancedCount = 0;
    let expertCount = 0;

    snapResult.rows.forEach((r: { gap_percentage: number; proficiency_level: ProficiencyLevel }) => {
      totalGaps += Number(r.gap_percentage);
      gapCount++;
      if (r.proficiency_level === 'NOVICE') noviceCount++;
      if (r.proficiency_level === 'INTERMEDIATE') intermediateCount++;
      if (r.proficiency_level === 'ADVANCED') advancedCount++;
      if (r.proficiency_level === 'EXPERT') expertCount++;
    });

    const averageGapPercentage = gapCount > 0 ? Number((totalGaps / gapCount).toFixed(2)) : 0.0;

    return {
      competencies,
      trainees,
      summary: {
        totalCompetencies: competencies.length,
        totalTraineesEvaluated: trainees.length,
        averageGapPercentage,
        noviceCount,
        intermediateCount,
        advancedCount,
        expertCount,
      },
    };
  }
}

export const competencyRepository = new CompetencyRepository();
