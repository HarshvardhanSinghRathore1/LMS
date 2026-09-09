import { pool } from '../../config/database';
import {
  CourseEnrollmentRecord,
  CourseEnrollmentWithCourse,
  LessonProgressRecord,
  OrganizationEnrollmentMetrics,
} from './enrollment.types';

import { competencyService } from '../competencies/competency.service';

export class EnrollmentRepository {
  /**
   * Count total lessons in a course hierarchy
   */
  async countTotalLessonsForCourse(courseId: string, executor: any = pool): Promise<number> {
    const query = `
      SELECT COUNT(l.id)::int as total
      FROM course_lessons l
      JOIN course_modules m ON l.module_id = m.id
      WHERE m.course_id = $1;
    `;
    const result = await executor.query(query, [courseId]);
    return result.rows[0]?.total || 0;
  }

  /**
   * Create new enrollment for a trainee
   */
  async createEnrollment(
    data: {
      organizationId: string;
      courseId: string;
      traineeId: string;
      totalLessonsCount: number;
    },
    executor: any = pool
  ): Promise<CourseEnrollmentRecord> {
    const query = `
      INSERT INTO course_enrollments (
        organization_id,
        course_id,
        trainee_id,
        status,
        progress_percentage,
        completed_lessons_count,
        total_lessons_count
      )
      VALUES ($1, $2, $3, 'ENROLLED', 0.00, 0, $4)
      RETURNING *;
    `;
    const values = [data.organizationId, data.courseId, data.traineeId, data.totalLessonsCount];
    const result = await executor.query(query, values);
    return result.rows[0];
  }

  /**
   * Find enrollment by ID strictly for a specific trainee and organization
   */
  async findEnrollmentByIdForTrainee(
    enrollmentId: string,
    traineeId: string,
    organizationId: string
  ): Promise<CourseEnrollmentWithCourse | null> {
    const query = `
      SELECT e.*, c.title as course_title, c.description as course_description,
             c.category, c.difficulty_level, TRIM(CONCAT(u.first_name, ' ', u.last_name)) as creator_name
      FROM course_enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON c.creator_id = u.id
      WHERE e.id = $1 AND e.trainee_id = $2 AND e.organization_id = $3;
    `;
    const result = await pool.query<CourseEnrollmentWithCourse>(query, [
      enrollmentId,
      traineeId,
      organizationId,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Find enrollment by ID for an organization (for Admins / Trainers)
   */
  async findEnrollmentByIdForOrganization(
    enrollmentId: string,
    organizationId: string
  ): Promise<CourseEnrollmentWithCourse | null> {
    const query = `
      SELECT e.*, c.title as course_title, c.description as course_description,
             c.category, c.difficulty_level, TRIM(CONCAT(u.first_name, ' ', u.last_name)) as creator_name
      FROM course_enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON c.creator_id = u.id
      WHERE e.id = $1 AND e.organization_id = $2;
    `;
    const result = await pool.query<CourseEnrollmentWithCourse>(query, [
      enrollmentId,
      organizationId,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Find enrollment by course ID and trainee ID
   */
  async findEnrollmentByCourseAndTrainee(
    courseId: string,
    traineeId: string,
    organizationId: string,
    executor: any = pool
  ): Promise<CourseEnrollmentRecord | null> {
    const query = `
      SELECT * FROM course_enrollments
      WHERE course_id = $1 AND trainee_id = $2 AND organization_id = $3;
    `;
    const result = await executor.query(query, [
      courseId,
      traineeId,
      organizationId,
    ]);
    return result.rows[0] || null;
  }

  /**
   * List enrollments for a trainee
   */
  async listEnrollmentsForTrainee(
    traineeId: string,
    organizationId: string,
    options: { status?: string; page: number; limit: number }
  ): Promise<{ enrollments: CourseEnrollmentWithCourse[]; total: number }> {
    const offset = (options.page - 1) * options.limit;
    const params: any[] = [traineeId, organizationId];
    let whereClause = `WHERE e.trainee_id = $1 AND e.organization_id = $2`;

    if (options.status) {
      params.push(options.status);
      whereClause += ` AND e.status = $${params.length}`;
    }

    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM course_enrollments e
      ${whereClause};
    `;
    const countResult = await pool.query<{ total: number }>(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    params.push(options.limit, offset);
    const dataQuery = `
      SELECT e.*, c.title as course_title, c.description as course_description,
             c.category, c.difficulty_level, TRIM(CONCAT(u.first_name, ' ', u.last_name)) as creator_name
      FROM course_enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON c.creator_id = u.id
      ${whereClause}
      ORDER BY e.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length};
    `;
    const dataResult = await pool.query<CourseEnrollmentWithCourse>(dataQuery, params);

    return { enrollments: dataResult.rows, total };
  }

  /**
   * Get all lesson progress entries for a given enrollment
   */
  async getLessonProgressForEnrollment(
    enrollmentId: string,
    traineeId: string
  ): Promise<LessonProgressRecord[]> {
    const query = `
      SELECT * FROM lesson_progress
      WHERE enrollment_id = $1 AND trainee_id = $2
      ORDER BY created_at ASC;
    `;
    const result = await pool.query<LessonProgressRecord>(query, [enrollmentId, traineeId]);
    return result.rows;
  }

  /**
   * Transactional lesson completion update and progress calculation
   */
  async updateLessonProgressAndRecalculate(params: {
    enrollmentId: string;
    lessonId: string;
    traineeId: string;
    organizationId: string;
    completed: boolean;
  }): Promise<{ enrollment: CourseEnrollmentRecord; lessonProgress: LessonProgressRecord }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch & lock enrollment record
      const enrollmentQuery = `
        SELECT * FROM course_enrollments
        WHERE id = $1 AND trainee_id = $2 AND organization_id = $3
        FOR UPDATE;
      `;
      const enrollmentResult = await client.query<CourseEnrollmentRecord>(enrollmentQuery, [
        params.enrollmentId,
        params.traineeId,
        params.organizationId,
      ]);

      const enrollment = enrollmentResult.rows[0];
      if (!enrollment) {
        throw new Error('ENROLLMENT_NOT_FOUND');
      }

      if (enrollment.status === 'DROPPED') {
        throw new Error('ENROLLMENT_DROPPED');
      }

      // 2. Validate lesson belongs to enrollment course
      const lessonValidationQuery = `
        SELECT l.id
        FROM course_lessons l
        JOIN course_modules m ON l.module_id = m.id
        WHERE l.id = $1 AND m.course_id = $2;
      `;
      const lessonValidationResult = await client.query(lessonValidationQuery, [
        params.lessonId,
        enrollment.course_id,
      ]);

      if (lessonValidationResult.rows.length === 0) {
        throw new Error('LESSON_NOT_IN_COURSE');
      }

      // 3. Upsert lesson progress
      const completedAt = params.completed ? new Date() : null;
      const upsertProgressQuery = `
        INSERT INTO lesson_progress (enrollment_id, lesson_id, trainee_id, is_completed, completed_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (enrollment_id, lesson_id)
        DO UPDATE SET
          is_completed = EXCLUDED.is_completed,
          completed_at = EXCLUDED.completed_at,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const progressResult = await client.query<LessonProgressRecord>(upsertProgressQuery, [
        params.enrollmentId,
        params.lessonId,
        params.traineeId,
        params.completed,
        completedAt,
      ]);
      const lessonProgress = progressResult.rows[0];

      // 4. Count total lessons & completed lessons for recalculation
      const totalLessonsQuery = `
        SELECT COUNT(l.id)::int as total
        FROM course_lessons l
        JOIN course_modules m ON l.module_id = m.id
        WHERE m.course_id = $1;
      `;
      const totalResult = await client.query<{ total: number }>(totalLessonsQuery, [
        enrollment.course_id,
      ]);
      const totalLessonsCount = totalResult.rows[0]?.total || 0;

      const completedLessonsQuery = `
        SELECT COUNT(*)::int as completed_count
        FROM lesson_progress
        WHERE enrollment_id = $1 AND is_completed = true;
      `;
      const completedResult = await client.query<{ completed_count: number }>(
        completedLessonsQuery,
        [params.enrollmentId]
      );
      const completedLessonsCount = completedResult.rows[0]?.completed_count || 0;

      // 5. Calculate progress percentage
      let progressPercentage = 0.0;
      if (totalLessonsCount > 0) {
        progressPercentage = Number(
          ((completedLessonsCount / totalLessonsCount) * 100).toFixed(2)
        );
      }

      // 6. Determine status & completion timestamp
      let newStatus: CourseEnrollmentRecord['status'] = 'ENROLLED';
      let enrollmentCompletedAt: Date | null = null;

      if (totalLessonsCount > 0 && completedLessonsCount === totalLessonsCount) {
        newStatus = 'COMPLETED';
        enrollmentCompletedAt = enrollment.completed_at || new Date();
      } else if (completedLessonsCount > 0) {
        newStatus = 'IN_PROGRESS';
        enrollmentCompletedAt = null;
      } else {
        newStatus = 'ENROLLED';
        enrollmentCompletedAt = null;
      }

      // 7. Update course_enrollments
      const updateEnrollmentQuery = `
        UPDATE course_enrollments
        SET
          completed_lessons_count = $1,
          total_lessons_count = $2,
          progress_percentage = $3,
          status = $4,
          completed_at = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *;
      `;
      const updatedEnrollmentResult = await client.query<CourseEnrollmentRecord>(
        updateEnrollmentQuery,
        [
          completedLessonsCount,
          totalLessonsCount,
          progressPercentage,
          newStatus,
          enrollmentCompletedAt,
          params.enrollmentId,
        ]
      );

      // 8. Synchronous Transactional Competency Reevaluation
      try {
        await competencyService.reevaluateTraineeCompetencies(
          client,
          params.traineeId,
          params.organizationId,
          enrollment.course_id
        );
      } catch (compErr: any) {
        console.error(`⚠️ Competency Reevaluation Error during Lesson Progress update:`, compErr.message);
        throw compErr;
      }

      await client.query('COMMIT');
      return {
        enrollment: updatedEnrollmentResult.rows[0],
        lessonProgress,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Drop enrollment
   */
  async dropEnrollment(
    enrollmentId: string,
    traineeId: string,
    organizationId: string
  ): Promise<CourseEnrollmentRecord | null> {
    const query = `
      UPDATE course_enrollments
      SET status = 'DROPPED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND trainee_id = $2 AND organization_id = $3 AND status != 'COMPLETED'
      RETURNING *;
    `;
    const result = await pool.query<CourseEnrollmentRecord>(query, [
      enrollmentId,
      traineeId,
      organizationId,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Get organization-wide enrollment metrics
   */
  async getOrganizationMetrics(organizationId: string): Promise<OrganizationEnrollmentMetrics> {
    const query = `
      SELECT
        COUNT(*)::int as "totalEnrollments",
        COUNT(CASE WHEN status IN ('ENROLLED', 'IN_PROGRESS') THEN 1 END)::int as "activeEnrollments",
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as "completedEnrollments",
        COUNT(CASE WHEN status = 'DROPPED' THEN 1 END)::int as "droppedEnrollments",
        COALESCE(ROUND(AVG(progress_percentage)::numeric, 2), 0.00)::float as "averageProgressPercentage"
      FROM course_enrollments
      WHERE organization_id = $1;
    `;
    const result = await pool.query<OrganizationEnrollmentMetrics>(query, [organizationId]);
    return (
      result.rows[0] || {
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        droppedEnrollments: 0,
        averageProgressPercentage: 0.0,
      }
    );
  }
}

export const enrollmentRepository = new EnrollmentRepository();
