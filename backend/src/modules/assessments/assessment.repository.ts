import { pool } from '../../config/database';
import {
  AssessmentRecord,
  QuestionRecord,
  SafeQuestionDTO,
  SubmissionRecord,
  OrganizationAssessmentMetrics,
  AssessmentStatus,
} from './assessment.types';

export class AssessmentRepository {
  /**
   * Create new assessment
   */
  async createAssessment(data: {
    organizationId: string;
    courseId: string;
    creatorId: string;
    title: string;
    description?: string;
    passingScorePercentage: number;
    timeLimitMinutes?: number | null;
    maxAttempts: number;
  }): Promise<AssessmentRecord> {
    const query = `
      INSERT INTO assessments (
        organization_id,
        course_id,
        creator_id,
        title,
        description,
        passing_score_percentage,
        time_limit_minutes,
        max_attempts,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT')
      RETURNING *;
    `;
    const values = [
      data.organizationId,
      data.courseId,
      data.creatorId,
      data.title,
      data.description || '',
      data.passingScorePercentage,
      data.timeLimitMinutes || null,
      data.maxAttempts,
    ];
    const result = await pool.query<AssessmentRecord>(query, values);
    return result.rows[0];
  }

  /**
   * Find assessment by ID for an organization (with joined details)
   */
  async findAssessmentByIdForOrganization(
    assessmentId: string,
    organizationId: string
  ): Promise<AssessmentRecord | null> {
    const query = `
      SELECT a.*, c.title as course_title,
             TRIM(CONCAT(u.first_name, ' ', u.last_name)) as creator_name,
             (SELECT COUNT(*)::int FROM assessment_questions q WHERE q.assessment_id = a.id) as questions_count,
             COALESCE((SELECT SUM(q.points)::int FROM assessment_questions q WHERE q.assessment_id = a.id), 0) as total_points
      FROM assessments a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN users u ON a.creator_id = u.id
      WHERE a.id = $1 AND a.organization_id = $2;
    `;
    const result = await pool.query<AssessmentRecord>(query, [assessmentId, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * List assessments for an organization
   */
  async listAssessmentsForOrganization(
    organizationId: string,
    options: { courseId?: string; status?: AssessmentStatus; page: number; limit: number }
  ): Promise<{ assessments: AssessmentRecord[]; total: number }> {
    const offset = (options.page - 1) * options.limit;
    const params: any[] = [organizationId];
    let whereClause = `WHERE a.organization_id = $1`;

    if (options.courseId) {
      params.push(options.courseId);
      whereClause += ` AND a.course_id = $${params.length}`;
    }

    if (options.status) {
      params.push(options.status);
      whereClause += ` AND a.status = $${params.length}`;
    }

    const countQuery = `SELECT COUNT(*)::int as total FROM assessments a ${whereClause};`;
    const countResult = await pool.query<{ total: number }>(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    params.push(options.limit, offset);
    const dataQuery = `
      SELECT a.*, c.title as course_title,
             TRIM(CONCAT(u.first_name, ' ', u.last_name)) as creator_name,
             (SELECT COUNT(*)::int FROM assessment_questions q WHERE q.assessment_id = a.id) as questions_count,
             COALESCE((SELECT SUM(q.points)::int FROM assessment_questions q WHERE q.assessment_id = a.id), 0) as total_points
      FROM assessments a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN users u ON a.creator_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length};
    `;
    const dataResult = await pool.query<AssessmentRecord>(dataQuery, params);
    return { assessments: dataResult.rows, total };
  }

  /**
   * Update assessment details
   */
  async updateAssessment(
    assessmentId: string,
    organizationId: string,
    updates: {
      title?: string;
      description?: string;
      passingScorePercentage?: number;
      timeLimitMinutes?: number | null;
      maxAttempts?: number;
    }
  ): Promise<AssessmentRecord | null> {
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [assessmentId, organizationId];
    let index = 3;

    if (updates.title !== undefined) {
      fields.push(`title = $${index++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(updates.description);
    }
    if (updates.passingScorePercentage !== undefined) {
      fields.push(`passing_score_percentage = $${index++}`);
      values.push(updates.passingScorePercentage);
    }
    if (updates.timeLimitMinutes !== undefined) {
      fields.push(`time_limit_minutes = $${index++}`);
      values.push(updates.timeLimitMinutes);
    }
    if (updates.maxAttempts !== undefined) {
      fields.push(`max_attempts = $${index++}`);
      values.push(updates.maxAttempts);
    }

    const query = `
      UPDATE assessments
      SET ${fields.join(', ')}
      WHERE id = $1 AND organization_id = $2
      RETURNING *;
    `;
    const result = await pool.query<AssessmentRecord>(query, values);
    return result.rows[0] || null;
  }

  /**
   * Update assessment status (DRAFT, PUBLISHED, ARCHIVED)
   */
  async updateAssessmentStatus(
    assessmentId: string,
    organizationId: string,
    status: AssessmentStatus
  ): Promise<AssessmentRecord | null> {
    const query = `
      UPDATE assessments
      SET status = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND organization_id = $2
      RETURNING *;
    `;
    const result = await pool.query<AssessmentRecord>(query, [
      assessmentId,
      organizationId,
      status,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Add question to assessment
   */
  async createQuestion(data: {
    assessmentId: string;
    questionText: string;
    questionType: string;
    points: number;
    orderIndex: number;
    options: any[];
    correctAnswer: any;
  }): Promise<QuestionRecord> {
    const query = `
      INSERT INTO assessment_questions (
        assessment_id, question_text, question_type, points, order_index, options, correct_answer
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      data.assessmentId,
      data.questionText,
      data.questionType,
      data.points,
      data.orderIndex,
      JSON.stringify(data.options),
      JSON.stringify(data.correctAnswer),
    ];
    const result = await pool.query<QuestionRecord>(query, values);
    return result.rows[0];
  }

  /**
   * List questions for an assessment.
   * STRICT SECURITY GUARANTEE: If includeCorrectAnswer is false, correct_answer is NEVER selected or returned!
   */
  async listQuestionsForAssessment(
    assessmentId: string,
    includeCorrectAnswer: boolean
  ): Promise<QuestionRecord[] | SafeQuestionDTO[]> {
    if (includeCorrectAnswer) {
      const query = `
        SELECT * FROM assessment_questions
        WHERE assessment_id = $1
        ORDER BY order_index ASC;
      `;
      const result = await pool.query<QuestionRecord>(query, [assessmentId]);
      return result.rows;
    } else {
      const query = `
        SELECT id, assessment_id, question_text, question_type, points, order_index, options
        FROM assessment_questions
        WHERE assessment_id = $1
        ORDER BY order_index ASC;
      `;
      const result = await pool.query<SafeQuestionDTO>(query, [assessmentId]);
      return result.rows;
    }
  }

  /**
   * Update question details
   */
  async updateQuestion(
    questionId: string,
    assessmentId: string,
    updates: {
      questionText?: string;
      questionType?: string;
      points?: number;
      orderIndex?: number;
      options?: any[];
      correctAnswer?: any;
    }
  ): Promise<QuestionRecord | null> {
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [questionId, assessmentId];
    let index = 3;

    if (updates.questionText !== undefined) {
      fields.push(`question_text = $${index++}`);
      values.push(updates.questionText);
    }
    if (updates.questionType !== undefined) {
      fields.push(`question_type = $${index++}`);
      values.push(updates.questionType);
    }
    if (updates.points !== undefined) {
      fields.push(`points = $${index++}`);
      values.push(updates.points);
    }
    if (updates.orderIndex !== undefined) {
      fields.push(`order_index = $${index++}`);
      values.push(updates.orderIndex);
    }
    if (updates.options !== undefined) {
      fields.push(`options = $${index++}`);
      values.push(JSON.stringify(updates.options));
    }
    if (updates.correctAnswer !== undefined) {
      fields.push(`correct_answer = $${index++}`);
      values.push(JSON.stringify(updates.correctAnswer));
    }

    const query = `
      UPDATE assessment_questions
      SET ${fields.join(', ')}
      WHERE id = $1 AND assessment_id = $2
      RETURNING *;
    `;
    const result = await pool.query<QuestionRecord>(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete question
   */
  async deleteQuestion(questionId: string, assessmentId: string): Promise<boolean> {
    const query = `DELETE FROM assessment_questions WHERE id = $1 AND assessment_id = $2;`;
    const result = await pool.query(query, [questionId, assessmentId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Count total completed or in-progress attempt submissions for a trainee on an assessment
   */
  async countSubmissionsForTrainee(assessmentId: string, traineeId: string): Promise<number> {
    const query = `
      SELECT COUNT(*)::int as total
      FROM assessment_submissions
      WHERE assessment_id = $1 AND trainee_id = $2;
    `;
    const result = await pool.query<{ total: number }>(query, [assessmentId, traineeId]);
    return result.rows[0]?.total || 0;
  }

  /**
   * Find active IN_PROGRESS attempt for a trainee
   */
  async findActiveAttempt(
    assessmentId: string,
    traineeId: string
  ): Promise<SubmissionRecord | null> {
    const query = `
      SELECT * FROM assessment_submissions
      WHERE assessment_id = $1 AND trainee_id = $2 AND status = 'IN_PROGRESS';
    `;
    const result = await pool.query<SubmissionRecord>(query, [assessmentId, traineeId]);
    return result.rows[0] || null;
  }

  /**
   * Create new attempt
   */
  async createAttempt(data: {
    organizationId: string;
    assessmentId: string;
    traineeId: string;
    enrollmentId: string;
    attemptNumber: number;
    expiresAt: Date | null;
  }): Promise<SubmissionRecord> {
    const query = `
      INSERT INTO assessment_submissions (
        organization_id,
        assessment_id,
        trainee_id,
        enrollment_id,
        attempt_number,
        status,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', $6)
      RETURNING *;
    `;
    const values = [
      data.organizationId,
      data.assessmentId,
      data.traineeId,
      data.enrollmentId,
      data.attemptNumber,
      data.expiresAt,
    ];
    const result = await pool.query<SubmissionRecord>(query, values);
    return result.rows[0];
  }

  /**
   * Find submission attempt by ID
   */
  async findSubmissionById(
    submissionId: string,
    organizationId: string
  ): Promise<SubmissionRecord | null> {
    const query = `
      SELECT s.*, a.title as assessment_title,
             TRIM(CONCAT(u.first_name, ' ', u.last_name)) as trainee_name
      FROM assessment_submissions s
      JOIN assessments a ON s.assessment_id = a.id
      JOIN users u ON s.trainee_id = u.id
      WHERE s.id = $1 AND s.organization_id = $2;
    `;
    const result = await pool.query<SubmissionRecord>(query, [submissionId, organizationId]);
    return result.rows[0] || null;
  }

  /**
   * List submissions for a trainee
   */
  async listSubmissionsForTrainee(
    traineeId: string,
    organizationId: string,
    assessmentId?: string
  ): Promise<SubmissionRecord[]> {
    const params: any[] = [traineeId, organizationId];
    let whereClause = `WHERE s.trainee_id = $1 AND s.organization_id = $2`;

    if (assessmentId) {
      params.push(assessmentId);
      whereClause += ` AND s.assessment_id = $3`;
    }

    const query = `
      SELECT s.*, a.title as assessment_title
      FROM assessment_submissions s
      JOIN assessments a ON s.assessment_id = a.id
      ${whereClause}
      ORDER BY s.attempt_number DESC;
    `;
    const result = await pool.query<SubmissionRecord>(query, params);
    return result.rows;
  }

  /**
   * Transactional automated submission grading & persistance
   */
  async submitAndGradeAttempt(params: {
    submissionId: string;
    traineeId: string;
    organizationId: string;
    submittedAnswers: Record<string, any>;
  }): Promise<SubmissionRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch & lock submission row
      const subQuery = `
        SELECT s.*, a.passing_score_percentage, a.id as a_id
        FROM assessment_submissions s
        JOIN assessments a ON s.assessment_id = a.id
        WHERE s.id = $1 AND s.trainee_id = $2 AND s.organization_id = $3
        FOR UPDATE;
      `;
      const subResult = await client.query<SubmissionRecord & { passing_score_percentage: number }>(
        subQuery,
        [params.submissionId, params.traineeId, params.organizationId]
      );
      const submission = subResult.rows[0];

      if (!submission) {
        throw new Error('SUBMISSION_NOT_FOUND');
      }

      if (submission.status !== 'IN_PROGRESS') {
        throw new Error('SUBMISSION_ALREADY_COMPLETED');
      }

      // 2. Check server-side timer expiration
      const now = new Date();
      if (submission.expires_at && now > new Date(submission.expires_at)) {
        const expireQuery = `
          UPDATE assessment_submissions
          SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *;
        `;
        const expiredRes = await client.query<SubmissionRecord>(expireQuery, [params.submissionId]);
        await client.query('COMMIT');
        throw new Error('ATTEMPT_EXPIRED');
      }

      // 3. Load authoritative questions with correct_answer keys
      const questionsQuery = `
        SELECT * FROM assessment_questions
        WHERE assessment_id = $1
        ORDER BY order_index ASC;
      `;
      const questionsResult = await client.query<QuestionRecord>(questionsQuery, [
        submission.assessment_id,
      ]);
      const questions = questionsResult.rows;

      if (questions.length === 0) {
        throw new Error('NO_QUESTIONS_FOUND');
      }

      // 4. Automated Grading Algorithm
      let totalPointsEarned = 0;
      let maxPointsPossible = 0;

      for (const q of questions) {
        maxPointsPossible += q.points;
        const userAnswer = params.submittedAnswers[q.id];

        if (userAnswer !== undefined && userAnswer !== null) {
          // Normalize string / boolean comparison
          const normUser = String(userAnswer).trim().toLowerCase();
          const normCorrect = String(q.correct_answer).trim().toLowerCase();

          if (normUser === normCorrect) {
            totalPointsEarned += q.points;
          }
        }
      }

      // 5. Calculate Score Percentage & Pass/Fail Status
      let scorePercentage = 0.0;
      if (maxPointsPossible > 0) {
        scorePercentage = Number(((totalPointsEarned / maxPointsPossible) * 100).toFixed(2));
      }

      const passed = scorePercentage >= submission.passing_score_percentage;

      // 6. Update Submission record
      const updateQuery = `
        UPDATE assessment_submissions
        SET
          score_percentage = $1,
          total_points_earned = $2,
          max_points_possible = $3,
          passed = $4,
          status = 'SUBMITTED',
          answers = $5,
          submitted_at = CURRENT_TIMESTAMP,
          graded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *;
      `;
      const updatedRes = await client.query<SubmissionRecord>(updateQuery, [
        scorePercentage,
        totalPointsEarned,
        maxPointsPossible,
        passed,
        JSON.stringify(params.submittedAnswers),
        params.submissionId,
      ]);

      await client.query('COMMIT');
      return updatedRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get organization-wide assessment metrics
   */
  async getOrganizationMetrics(organizationId: string): Promise<OrganizationAssessmentMetrics> {
    const query = `
      SELECT
        (SELECT COUNT(*)::int FROM assessments WHERE organization_id = $1) as "totalAssessments",
        (SELECT COUNT(*)::int FROM assessments WHERE organization_id = $1 AND status = 'PUBLISHED') as "publishedAssessments",
        (SELECT COUNT(*)::int FROM assessment_submissions WHERE organization_id = $1) as "totalAttempts",
        (SELECT COUNT(*)::int FROM assessment_submissions WHERE organization_id = $1 AND status = 'SUBMITTED') as "completedAttempts",
        (SELECT COUNT(*)::int FROM assessment_submissions WHERE organization_id = $1 AND passed = true) as "passedAttempts",
        (SELECT COUNT(*)::int FROM assessment_submissions WHERE organization_id = $1 AND passed = false) as "failedAttempts",
        COALESCE((SELECT ROUND(AVG(score_percentage)::numeric, 2) FROM assessment_submissions WHERE organization_id = $1 AND status = 'SUBMITTED'), 0.00)::float as "averageScorePercentage",
        COALESCE((SELECT ROUND((COUNT(CASE WHEN passed = true THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END), 0) * 100)::numeric, 2) FROM assessment_submissions WHERE organization_id = $1), 0.00)::float as "passRatePercentage";
    `;
    const result = await pool.query<OrganizationAssessmentMetrics>(query, [organizationId]);
    return (
      result.rows[0] || {
        totalAssessments: 0,
        publishedAssessments: 0,
        totalAttempts: 0,
        completedAttempts: 0,
        passedAttempts: 0,
        failedAttempts: 0,
        averageScorePercentage: 0.0,
        passRatePercentage: 0.0,
      }
    );
  }
}

export const assessmentRepository = new AssessmentRepository();
