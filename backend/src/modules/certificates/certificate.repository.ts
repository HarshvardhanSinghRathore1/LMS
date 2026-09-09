import { pool } from '../../config/database';
import { PoolClient } from 'pg';
import {
  CertificateRecord,
  CertificateWithDetails,
  CompletionVerificationResult,
  CompetencySnapshot,
} from './certificate.types';

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class CertificateRepository {
  /**
   * Evaluate all PostgreSQL completion criteria deterministically.
   */
  async verifyCourseCompletionCriteria(
    client: PoolClient,
    enrollmentId: string,
    traineeId: string,
    organizationId: string
  ): Promise<{
    verification: CompletionVerificationResult;
    enrollment: any;
    courseId: string;
  }> {
    const failedCriteria: string[] = [];

    // 1. Lock and fetch enrollment
    const enrollmentQuery = `
      SELECT 
        e.*,
        c.title as course_title,
        c.organization_id as course_org_id
      FROM course_enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.id = $1 AND e.trainee_id = $2 AND e.organization_id = $3
      FOR UPDATE OF e;
    `;
    const enrollmentRes = await client.query(enrollmentQuery, [
      enrollmentId,
      traineeId,
      organizationId,
    ]);

    if (enrollmentRes.rows.length === 0) {
      throw new NotFoundError('Active enrollment not found for authenticated trainee and organization');
    }

    const enrollment = enrollmentRes.rows[0];
    const courseId = enrollment.course_id;

    // Criterion A: Enrollment Status & Progress
    const enrollmentCompleted = enrollment.status === 'COMPLETED';
    const progressComplete = Number(enrollment.progress_percentage) === 100;

    if (!enrollmentCompleted) {
      failedCriteria.push('Enrollment status is not COMPLETED');
    }
    if (!progressComplete) {
      failedCriteria.push('Progress percentage is less than 100%');
    }

    // Criterion B: Mandatory Lessons Complete
    const totalLessonsQuery = `
      SELECT COUNT(l.id)::integer as total_lessons
      FROM course_lessons l
      JOIN course_modules m ON l.module_id = m.id
      WHERE m.course_id = $1;
    `;
    const totalLessonsRes = await client.query(totalLessonsQuery, [courseId]);
    const totalLessonsCount = Number(totalLessonsRes.rows[0].total_lessons);

    const completedLessonsQuery = `
      SELECT COUNT(lp.id)::integer as completed_lessons
      FROM lesson_progress lp
      JOIN course_lessons l ON lp.lesson_id = l.id
      JOIN course_modules m ON l.module_id = m.id
      WHERE m.course_id = $1 AND lp.trainee_id = $2 AND lp.is_completed = true;
    `;
    const completedLessonsRes = await client.query(completedLessonsQuery, [courseId, traineeId]);
    const completedLessonsCount = Number(completedLessonsRes.rows[0].completed_lessons);

    let allMandatoryLessonsComplete = false;
    if (totalLessonsCount === 0) {
      failedCriteria.push('Course contains zero published lessons');
    } else if (completedLessonsCount < totalLessonsCount) {
      failedCriteria.push(`Only ${completedLessonsCount} of ${totalLessonsCount} lessons are completed`);
    } else {
      allMandatoryLessonsComplete = true;
    }

    // Criterion C: Published Assessments Passing Score (>= 70.00%)
    const publishedAssessmentsQuery = `
      SELECT id, title, passing_score_percentage
      FROM assessments
      WHERE course_id = $1 AND status = 'PUBLISHED' AND organization_id = $2;
    `;
    const assessmentsRes = await client.query(publishedAssessmentsQuery, [courseId, organizationId]);
    const publishedAssessments = assessmentsRes.rows;
    const publishedAssessmentsCount = publishedAssessments.length;

    let passedAssessmentsCount = 0;
    let allAssessmentsPassed = true;
    let totalAssessmentScoreSum = 0;

    if (publishedAssessmentsCount === 0) {
      allAssessmentsPassed = true;
    } else {
      for (const assessment of publishedAssessments) {
        const latestAttemptQuery = `
          SELECT score_percentage, status
          FROM assessment_submissions
          WHERE assessment_id = $1 AND trainee_id = $2 AND status = 'SUBMITTED'
          ORDER BY submitted_at DESC
          LIMIT 1;
        `;
        const attemptRes = await client.query(latestAttemptQuery, [assessment.id, traineeId]);
        if (attemptRes.rows.length === 0) {
          allAssessmentsPassed = false;
          failedCriteria.push(`No submitted attempt for assessment: ${assessment.title}`);
        } else {
          const latestScore = Number(attemptRes.rows[0].score_percentage);
          totalAssessmentScoreSum += latestScore;
          if (latestScore >= 70.0) {
            passedAssessmentsCount++;
          } else {
            allAssessmentsPassed = false;
            failedCriteria.push(
              `Latest score (${latestScore.toFixed(2)}%) for assessment "${assessment.title}" is below 70.00% passing threshold`
            );
          }
        }
      }
    }

    // Calculate Final Score Percentage
    let finalScorePercentage = 100.0;
    if (publishedAssessmentsCount > 0) {
      finalScorePercentage = totalAssessmentScoreSum / publishedAssessmentsCount;
    } else {
      finalScorePercentage = Number(enrollment.progress_percentage);
    }
    finalScorePercentage = Math.min(100, Math.max(0, Number(finalScorePercentage.toFixed(2))));

    const eligible =
      enrollmentCompleted &&
      progressComplete &&
      allMandatoryLessonsComplete &&
      allAssessmentsPassed;

    return {
      verification: {
        eligible,
        enrollmentCompleted,
        progressComplete,
        allMandatoryLessonsComplete,
        allAssessmentsPassed,
        finalScorePercentage,
        totalLessonsCount,
        completedLessonsCount,
        publishedAssessmentsCount,
        passedAssessmentsCount,
        failedCriteria,
      },
      enrollment,
      courseId,
    };
  }

  /**
  /**
   * Helper mapper to ensure both camelCase and snake_case properties are populated
   */
  private mapCertificateRecord(r: any): any {
    if (!r) return null;
    const competenciesAchieved =
      typeof r.competencies_achieved === 'string'
        ? JSON.parse(r.competencies_achieved)
        : r.competencies_achieved || r.competenciesAchieved || [];

    const finalScorePercentage = Number(r.final_score_percentage ?? r.finalScorePercentage);

    return {
      id: r.id,
      organization_id: r.organization_id || r.organizationId,
      organizationId: r.organization_id || r.organizationId,
      enrollment_id: r.enrollment_id || r.enrollmentId,
      enrollmentId: r.enrollment_id || r.enrollmentId,
      trainee_id: r.trainee_id || r.traineeId,
      traineeId: r.trainee_id || r.traineeId,
      course_id: r.course_id || r.courseId,
      courseId: r.course_id || r.courseId,
      certificate_code: r.certificate_code || r.certificateCode,
      certificateCode: r.certificate_code || r.certificateCode,
      verification_hash: r.verification_hash || r.verificationHash,
      verificationHash: r.verification_hash || r.verificationHash,
      final_score_percentage: finalScorePercentage,
      finalScorePercentage: finalScorePercentage,
      competencies_achieved: competenciesAchieved,
      competenciesAchieved: competenciesAchieved,
      issued_at: r.issued_at || r.issuedAt,
      issuedAt: r.issued_at || r.issuedAt,
      created_at: r.created_at || r.createdAt,
      createdAt: r.created_at || r.createdAt,
      updated_at: r.updated_at || r.updatedAt,
      updatedAt: r.updated_at || r.updatedAt,
      trainee_name: r.trainee_name || r.traineeName,
      traineeName: r.trainee_name || r.traineeName,
      course_title: r.course_title || r.courseTitle,
      courseTitle: r.course_title || r.courseTitle,
      organization_name: r.organization_name || r.organizationName,
      organizationName: r.organization_name || r.organizationName,
    };
  }

  /**
   * Find existing certificate for an enrollment
   */
  async findExistingCertificateByEnrollment(
    enrollmentId: string,
    executor: any = pool
  ): Promise<CertificateRecord | null> {
    const query = `SELECT * FROM certificates WHERE enrollment_id = $1;`;
    const result = await executor.query(query, [enrollmentId]);
    if (result.rows.length === 0) return null;
    return this.mapCertificateRecord(result.rows[0]);
  }

  /**
   * Snapshot trainee competencies for the course where score indicates ADVANCED or EXPERT.
   */
  async findCompetencySnapshots(
    client: PoolClient,
    traineeId: string,
    courseId: string,
    organizationId: string
  ): Promise<CompetencySnapshot[]> {
    const query = `
      SELECT 
        c.id as "competencyId",
        c.code,
        c.name,
        tc.current_score_percentage as "scorePercentage"
      FROM course_competencies cc
      JOIN competencies c ON cc.competency_id = c.id
      JOIN trainee_competencies tc ON c.id = tc.competency_id
      WHERE cc.course_id = $1
        AND tc.trainee_id = $2
        AND tc.organization_id = $3
        AND c.organization_id = $3
        AND tc.current_score_percentage >= 75.0;
    `;
    const result = await client.query(query, [courseId, traineeId, organizationId]);
    return result.rows.map((r) => {
      const score = Number(r.scorePercentage);
      const proficiency: 'ADVANCED' | 'EXPERT' = score >= 90.0 ? 'EXPERT' : 'ADVANCED';
      return {
        competencyId: r.competencyId,
        code: r.code,
        name: r.name,
        proficiency,
        scorePercentage: Number(score.toFixed(2)),
      };
    });
  }

  /**
   * Insert certificate into database inside transaction.
   */
  async insertCertificateTransactional(
    client: PoolClient,
    data: {
      organizationId: string;
      enrollmentId: string;
      traineeId: string;
      courseId: string;
      certificateCode: string;
      verificationHash: string;
      finalScorePercentage: number;
      competenciesAchieved: CompetencySnapshot[];
      issuedAt: Date;
    }
  ): Promise<CertificateRecord> {
    const query = `
      INSERT INTO certificates (
        organization_id,
        enrollment_id,
        trainee_id,
        course_id,
        certificate_code,
        verification_hash,
        final_score_percentage,
        competencies_achieved,
        issued_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      data.organizationId,
      data.enrollmentId,
      data.traineeId,
      data.courseId,
      data.certificateCode,
      data.verificationHash,
      data.finalScorePercentage,
      JSON.stringify(data.competenciesAchieved),
      data.issuedAt,
    ];
    const result = await client.query(query, values);
    return this.mapCertificateRecord(result.rows[0]);
  }

  /**
   * Public Certificate Lookup by certificateCode. No JWT required.
   */
  async findCertificateByCodePublic(
    certificateCode: string
  ): Promise<CertificateWithDetails | null> {
    const query = `
      SELECT 
        c.id,
        c.organization_id,
        c.enrollment_id,
        c.trainee_id,
        c.course_id,
        c.certificate_code,
        c.verification_hash,
        c.final_score_percentage,
        c.competencies_achieved,
        c.issued_at,
        c.created_at,
        c.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) as trainee_name,
        crs.title as course_title,
        o.name as organization_name
      FROM certificates c
      JOIN users u ON c.trainee_id = u.id
      JOIN courses crs ON c.course_id = crs.id
      JOIN organizations o ON c.organization_id = o.id
      WHERE UPPER(c.certificate_code) = UPPER($1);
    `;
    const result = await pool.query(query, [certificateCode.trim()]);
    if (result.rows.length === 0) return null;
    return this.mapCertificateRecord(result.rows[0]);
  }

  /**
   * List certificates for an authenticated trainee in an organization.
   */
  async findCertificatesByTrainee(
    organizationId: string,
    traineeId: string
  ): Promise<CertificateWithDetails[]> {
    const query = `
      SELECT 
        c.id,
        c.organization_id,
        c.enrollment_id,
        c.trainee_id,
        c.course_id,
        c.certificate_code,
        c.verification_hash,
        c.final_score_percentage,
        c.competencies_achieved,
        c.issued_at,
        c.created_at,
        c.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) as trainee_name,
        crs.title as course_title,
        o.name as organization_name
      FROM certificates c
      JOIN users u ON c.trainee_id = u.id
      JOIN courses crs ON c.course_id = crs.id
      JOIN organizations o ON c.organization_id = o.id
      WHERE c.organization_id = $1 AND c.trainee_id = $2
      ORDER BY c.issued_at DESC;
    `;
    const result = await pool.query(query, [organizationId, traineeId]);
    return result.rows.map((r) => this.mapCertificateRecord(r));
  }

  /**
   * Find single certificate by ID for trainee and organization.
   */
  async findCertificateById(
    certificateId: string,
    organizationId: string,
    traineeId: string
  ): Promise<CertificateWithDetails | null> {
    const query = `
      SELECT 
        c.id,
        c.organization_id,
        c.enrollment_id,
        c.trainee_id,
        c.course_id,
        c.certificate_code,
        c.verification_hash,
        c.final_score_percentage,
        c.competencies_achieved,
        c.issued_at,
        c.created_at,
        c.updated_at,
        CONCAT(u.first_name, ' ', u.last_name) as trainee_name,
        crs.title as course_title,
        o.name as organization_name
      FROM certificates c
      JOIN users u ON c.trainee_id = u.id
      JOIN courses crs ON c.course_id = crs.id
      JOIN organizations o ON c.organization_id = o.id
      WHERE c.id = $1 AND c.organization_id = $2 AND c.trainee_id = $3;
    `;
    const result = await pool.query(query, [certificateId, organizationId, traineeId]);
    if (result.rows.length === 0) return null;
    return this.mapCertificateRecord(result.rows[0]);
  }
}
