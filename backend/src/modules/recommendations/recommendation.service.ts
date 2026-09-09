import { pool } from '../../config/database';
import { ApiError } from '../../utils/apiError';
import { recommendationRepository } from './recommendation.repository';
import { enrollmentRepository } from '../enrollments/enrollment.repository';
import { courseRepository } from '../courses/course.repository';
import {
  CandidateCompetency,
  CandidateCourse,
  CandidateEvaluation,
  PathwayStep,
  RecommendationRecord,
  RecommendationWithDetails,
  RecommendationType,
} from './recommendation.types';

export class RecommendationService {
  /**
   * Calculate Skill Gap Factor (0–100)
   */
  calculateSkillGapFactor(targetScorePercentage: number, currentScorePercentage: number): number {
    const target = Math.min(100, Math.max(0, Number(targetScorePercentage) || 0));
    const current = Math.min(100, Math.max(0, Number(currentScorePercentage) || 0));
    const gap = Math.max(0, target - current);
    const clamped = Math.min(100, Math.max(0, gap));
    return Math.round(clamped * 100) / 100;
  }

  /**
   * Calculate Competency Mapping Factor (0–100)
   */
  calculateCompetencyMappingFactor(
    courseCompetencyWeight: number,
    maxRelevantMappingWeight: number
  ): number {
    const weight = Math.max(0, Number(courseCompetencyWeight) || 0);
    const maxWeight = Math.max(0, Number(maxRelevantMappingWeight) || 0);
    if (maxWeight === 0) return 0;

    const normalized = (weight / maxWeight) * 100;
    const clamped = Math.min(100, Math.max(0, normalized));
    return Math.round(clamped * 100) / 100;
  }

  /**
   * Calculate Completion Rate Factor (0–100)
   */
  calculateCompletionRateFactor(completedEnrollments: number, eligibleEnrollments: number): number {
    const completed = Math.max(0, Number(completedEnrollments) || 0);
    const eligible = Math.max(0, Number(eligibleEnrollments) || 0);
    if (eligible === 0) return 0;

    const rate = (completed / eligible) * 100;
    const clamped = Math.min(100, Math.max(0, rate));
    return Math.round(clamped * 100) / 100;
  }

  /**
   * Final 60/25/15 Recommendation Score Calculation
   * Skill Gap: 60%
   * Competency Mapping: 25%
   * Completion Rate: 15%
   */
  calculateRecommendationScore(
    skillGapFactor: number,
    mappingFactor: number,
    completionRateFactor: number
  ): number {
    const sg = Math.min(100, Math.max(0, Number(skillGapFactor) || 0));
    const cm = Math.min(100, Math.max(0, Number(mappingFactor) || 0));
    const cr = Math.min(100, Math.max(0, Number(completionRateFactor) || 0));

    const score = sg * 0.6 + cm * 0.25 + cr * 0.15;
    const rounded = Math.round(score * 100) / 100;
    return Math.min(100, Math.max(0, rounded));
  }

  /**
   * Select primary competency with deterministic tie-breaking
   * 1. Highest priority (gapPercentage * normalizedMappingWeight)
   * 2. Highest gapPercentage
   * 3. Highest raw course competency weight
   * 4. Competency code ASC
   */
  selectPrimaryCompetency(
    mappedCompetencies: CandidateCompetency[],
    maxRelevantWeight: number
  ): CandidateCompetency | null {
    if (!mappedCompetencies || mappedCompetencies.length === 0) return null;

    const evaluated = mappedCompetencies.map((comp) => {
      const mappingFactor = this.calculateCompetencyMappingFactor(comp.weight, maxRelevantWeight);
      const priority = comp.gapPercentage * mappingFactor;
      return {
        comp,
        priority,
        gapPercentage: comp.gapPercentage,
        weight: comp.weight,
        code: comp.code,
      };
    });

    evaluated.sort((a, b) => {
      // 1. Highest priority
      if (Math.abs(b.priority - a.priority) > 0.0001) {
        return b.priority - a.priority;
      }
      // 2. Highest gap percentage
      if (Math.abs(b.gapPercentage - a.gapPercentage) > 0.0001) {
        return b.gapPercentage - a.gapPercentage;
      }
      // 3. Highest raw mapping weight
      if (Math.abs(b.weight - a.weight) > 0.0001) {
        return b.weight - a.weight;
      }
      // 4. Competency code ASC
      return a.code.localeCompare(b.code);
    });

    return evaluated[0].comp;
  }

  /**
   * Generate deterministic recommendation reason text
   */
  generateRecommendationReason(
    recommendationType: RecommendationType,
    primaryCompetencyName?: string,
    gapPercentage?: number,
    completionRate?: number
  ): string {
    if (recommendationType === 'PERSONALIZED' && primaryCompetencyName != null && gapPercentage != null) {
      return `Recommended because your ${primaryCompetencyName} skill gap is ${gapPercentage}%, and this course strongly aligns with that competency.`;
    }
    return `Recommended as a starting course based on strong historical completion performance in your organization.`;
  }

  /**
   * Core recommendation generation and refresh orchestration
   */
  async generateOrRefreshRecommendations(
    traineeId: string,
    organizationId: string
  ): Promise<RecommendationWithDetails[]> {
    // 1. Load trainee competency state from Stage 5
    const evaluatedCompetencies = await recommendationRepository.findTraineeEvaluatedCompetencies(
      traineeId,
      organizationId
    );

    const isPersonalizedEligible = evaluatedCompetencies.length > 0;

    // 2. Load eligible published candidate courses
    const rawCandidateCourses = await recommendationRepository.findEligibleCandidateCourses(
      traineeId,
      organizationId
    );

    if (rawCandidateCourses.length === 0) {
      return recommendationRepository.findActiveRecommendationsForTrainee(traineeId, organizationId);
    }

    const candidateCourseIds = rawCandidateCourses.map((c) => c.id);

    // 3. Load course competency mappings
    const rawMappings = await recommendationRepository.findCourseCompetencyMappings(
      candidateCourseIds,
      organizationId
    );

    // Build map of evaluated trainee competencies
    const traineeCompMap = new Map<string, CandidateCompetency>();
    for (const comp of evaluatedCompetencies) {
      traineeCompMap.set(comp.competencyId, comp);
    }

    // 4. Load organization completion rate statistics
    const completionMetrics = await recommendationRepository.getCourseCompletionRates(organizationId);

    // Map candidate courses with mappings & completion stats
    const candidateCourses: CandidateCourse[] = rawCandidateCourses.map((c) => {
      const courseMappings = rawMappings.filter((m) => m.course_id === c.id);

      const mappedCompetencies: CandidateCompetency[] = courseMappings.map((m) => {
        const traineeComp = traineeCompMap.get(m.competency_id);
        const target = m.target_score_percentage;
        const current = traineeComp ? traineeComp.currentScorePercentage : 0;
        const gap = this.calculateSkillGapFactor(target, current);

        return {
          competencyId: m.competency_id,
          code: m.code,
          name: m.name,
          weight: m.weight,
          targetScorePercentage: target,
          currentScorePercentage: current,
          gapPercentage: gap,
        };
      });

      const metrics = completionMetrics.get(c.id) || { completedCount: 0, totalCount: 0 };
      const completionRateFactor = this.calculateCompletionRateFactor(
        metrics.completedCount,
        metrics.totalCount
      );

      return {
        courseId: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        difficultyLevel: c.difficulty_level,
        organizationId: c.organization_id,
        status: c.status,
        mappedCompetencies,
        eligibleEnrollments: metrics.totalCount,
        completedEnrollments: metrics.completedCount,
        completionRateFactor,
      };
    });

    // Determine max relevant weight across candidate mappings
    let maxRelevantWeight = 0;
    for (const c of candidateCourses) {
      for (const m of c.mappedCompetencies) {
        if (m.weight > maxRelevantWeight) {
          maxRelevantWeight = m.weight;
        }
      }
    }

    // 5. Evaluate candidates & calculate scores
    const evaluations: CandidateEvaluation[] = [];

    if (isPersonalizedEligible) {
      // PERSONALIZED RECOMMENDATIONS
      for (const course of candidateCourses) {
        if (course.mappedCompetencies.length === 0) continue;

        const primaryComp = this.selectPrimaryCompetency(course.mappedCompetencies, maxRelevantWeight);
        if (!primaryComp) continue;

        const skillGapFactor = primaryComp.gapPercentage;
        const mappingFactor = this.calculateCompetencyMappingFactor(
          primaryComp.weight,
          maxRelevantWeight
        );
        const completionRateFactor = course.completionRateFactor;

        const recommendationScore = this.calculateRecommendationScore(
          skillGapFactor,
          mappingFactor,
          completionRateFactor
        );

        const recommendationReason = this.generateRecommendationReason(
          'PERSONALIZED',
          primaryComp.name,
          skillGapFactor,
          completionRateFactor
        );

        evaluations.push({
          course,
          recommendationType: 'PERSONALIZED',
          primaryCompetency: primaryComp,
          skillGapFactor,
          competencyMappingFactor: mappingFactor,
          completionRateFactor,
          recommendationScore,
          recommendationReason,
        });
      }
    }

    // If personalized evaluations yield no items (e.g. no mapped competencies in candidate courses) or user is cold start:
    if (evaluations.length === 0) {
      // COLD START RECOMMENDATIONS
      for (const course of candidateCourses) {
        const skillGapFactor = 0;
        const mappingFactor = 0;
        const completionRateFactor = course.completionRateFactor;

        const recommendationScore = this.calculateRecommendationScore(0, 0, completionRateFactor);

        const recommendationReason = this.generateRecommendationReason(
          'COLD_START',
          undefined,
          0,
          completionRateFactor
        );

        evaluations.push({
          course,
          recommendationType: 'COLD_START',
          primaryCompetency: null,
          skillGapFactor: 0,
          competencyMappingFactor: 0,
          completionRateFactor,
          recommendationScore,
          recommendationReason,
        });
      }
    }

    // Sort evaluations deterministically: score DESC, gap DESC, title ASC, courseId ASC
    evaluations.sort((a, b) => {
      if (Math.abs(b.recommendationScore - a.recommendationScore) > 0.0001) {
        return b.recommendationScore - a.recommendationScore;
      }
      if (Math.abs(b.skillGapFactor - a.skillGapFactor) > 0.0001) {
        return b.skillGapFactor - a.skillGapFactor;
      }
      const titleCompare = a.course.title.localeCompare(b.course.title);
      if (titleCompare !== 0) return titleCompare;
      return a.course.courseId.localeCompare(b.course.courseId);
    });

    // 6. Upsert recommendations preserving DISMISSED & ENROLLED records
    for (const evalItem of evaluations) {
      await recommendationRepository.upsertRecommendation({
        organizationId,
        traineeId,
        courseId: evalItem.course.courseId,
        competencyId: evalItem.primaryCompetency ? evalItem.primaryCompetency.competencyId : null,
        matchScore: evalItem.recommendationScore,
        gapPercentageAddressed: evalItem.skillGapFactor,
        recommendationReason: evalItem.recommendationReason,
        recommendationType: evalItem.recommendationType,
      });
    }

    // 7. Return active recommendations
    return recommendationRepository.findActiveRecommendationsForTrainee(traineeId, organizationId);
  }

  /**
   * Get authenticated trainee's active recommendations
   */
  async getMyActiveRecommendations(
    traineeId: string,
    organizationId: string
  ): Promise<RecommendationWithDetails[]> {
    return recommendationRepository.findActiveRecommendationsForTrainee(traineeId, organizationId);
  }

  /**
   * Dismiss an active recommendation
   */
  async dismissRecommendation(
    recommendationId: string,
    traineeId: string,
    organizationId: string
  ): Promise<RecommendationRecord> {
    const existing = await recommendationRepository.findRecommendationById(
      recommendationId,
      traineeId,
      organizationId
    );

    if (!existing) {
      throw ApiError.notFound('Recommendation record not found');
    }

    if (existing.status !== 'ACTIVE') {
      throw ApiError.conflict(
        `Recommendation cannot be dismissed because it is in '${existing.status}' state`,
        'RECOMMENDATION_NOT_ACTIVE'
      );
    }

    const dismissed = await recommendationRepository.dismissRecommendation(
      recommendationId,
      traineeId,
      organizationId
    );

    if (!dismissed) {
      throw ApiError.badRequest('Failed to dismiss recommendation', 'DISMISS_FAILED');
    }

    return dismissed;
  }

  /**
   * Atomic Accept + Enroll in ONE PostgreSQL Transaction
   * Supports optional testing flag forceEnrollmentFailure to deterministically verify rollback
   */
  async acceptRecommendation(
    recommendationId: string,
    traineeId: string,
    organizationId: string,
    options?: { forceEnrollmentFailure?: boolean }
  ): Promise<{ recommendation: RecommendationRecord; enrollment: any }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch & lock recommendation
      const rec = await recommendationRepository.findRecommendationForAcceptLock(
        recommendationId,
        traineeId,
        organizationId,
        client
      );

      if (!rec) {
        throw ApiError.notFound('Recommendation record not found');
      }

      if (rec.status !== 'ACTIVE') {
        throw ApiError.conflict(
          `Recommendation cannot be accepted because its status is '${rec.status}'`,
          'RECOMMENDATION_NOT_ACTIVE'
        );
      }

      // 2. Load & lock course
      const courseResult = await client.query(
        `SELECT * FROM courses WHERE id = $1 AND organization_id = $2 FOR UPDATE;`,
        [rec.course_id, organizationId]
      );
      const course = courseResult.rows[0];

      if (!course) {
        throw ApiError.notFound('Associated course not found in organization');
      }

      if (course.status !== 'PUBLISHED') {
        throw ApiError.badRequest(
          'Cannot accept recommendation for an unpublished course',
          'COURSE_NOT_PUBLISHED'
        );
      }

      // Rollback test hook
      if (options?.forceEnrollmentFailure) {
        throw new Error('FORCED_ENROLLMENT_FAILURE_FOR_TEST');
      }

      // 3. Check existing enrollment in Stage 3 using transaction client
      const existingEnrollment = await enrollmentRepository.findEnrollmentByCourseAndTrainee(
        rec.course_id,
        traineeId,
        organizationId,
        client
      );

      let enrollment = existingEnrollment;

      if (!enrollment) {
        // Count total lessons
        const totalLessonsCount = await enrollmentRepository.countTotalLessonsForCourse(
          rec.course_id,
          client
        );

        // Create enrollment inside transaction client
        enrollment = await enrollmentRepository.createEnrollment(
          {
            organizationId,
            courseId: rec.course_id,
            traineeId,
            totalLessonsCount,
          },
          client
        );
      }

      // 4. Update recommendation status to ENROLLED inside transaction client
      const updatedRec = await recommendationRepository.markRecommendationEnrolled(rec.id, client);

      await client.query('COMMIT');
      return { recommendation: updatedRec, enrollment };
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error.message === 'FORCED_ENROLLMENT_FAILURE_FOR_TEST') {
        throw ApiError.internal('Simulated enrollment failure for transaction rollback test');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get Adaptive Learning Pathway for trainee
   */
  async getAdaptivePathway(
    traineeId: string,
    organizationId: string,
    courseId?: string
  ): Promise<{ course: any; steps: PathwayStep[] }> {
    let targetCourseId = courseId;

    if (!targetCourseId) {
      // Deterministically select top active recommendation
      const activeRecs = await recommendationRepository.findActiveRecommendationsForTrainee(
        traineeId,
        organizationId
      );
      if (activeRecs.length > 0) {
        targetCourseId = activeRecs[0].course_id;
      } else {
        // Fallback: check trainee's active enrollments
        const enrollmentsResult = await pool.query(
          `SELECT course_id FROM course_enrollments WHERE trainee_id = $1 AND organization_id = $2 AND status IN ('ENROLLED', 'IN_PROGRESS') ORDER BY updated_at DESC LIMIT 1;`,
          [traineeId, organizationId]
        );
        if (enrollmentsResult.rows.length > 0) {
          targetCourseId = enrollmentsResult.rows[0].course_id;
        }
      }
    }

    if (!targetCourseId) {
      throw ApiError.notFound(
        'No active recommendations or enrollments available to build an adaptive pathway'
      );
    }

    const pathwayData = await recommendationRepository.getCoursePathwayData(
      targetCourseId,
      traineeId,
      organizationId
    );

    if (!pathwayData.course) {
      throw ApiError.notFound('Requested course not found or not authorized');
    }

    const completedLessonIds = new Set(
      pathwayData.lessonProgress.filter((p) => p.is_completed).map((p) => p.lesson_id)
    );

    const passedAssessmentIds = new Set(
      pathwayData.assessmentSubmissions.filter((s) => s.passed).map((s) => s.assessment_id)
    );

    const steps: PathwayStep[] = [];
    let stepNumber = 1;

    // Group lessons by module
    const lessonsByModuleMap = new Map<string, any[]>();
    for (const lesson of pathwayData.lessons) {
      if (!lessonsByModuleMap.has(lesson.module_id)) {
        lessonsByModuleMap.set(lesson.module_id, []);
      }
      lessonsByModuleMap.get(lesson.module_id)!.push(lesson);
    }

    for (const mod of pathwayData.modules) {
      const modLessons = lessonsByModuleMap.get(mod.id) || [];
      for (const lesson of modLessons) {
        steps.push({
          step: stepNumber++,
          type: 'LESSON',
          courseId: targetCourseId,
          moduleId: mod.id,
          lessonId: lesson.id,
          title: `${mod.title} — ${lesson.title}`,
          completed: completedLessonIds.has(lesson.id),
        });
      }
    }

    // Assessments
    for (const assessment of pathwayData.assessments) {
      steps.push({
        step: stepNumber++,
        type: 'ASSESSMENT',
        courseId: targetCourseId,
        assessmentId: assessment.id,
        title: `Assessment — ${assessment.title}`,
        completed: passedAssessmentIds.has(assessment.id),
      });
    }

    return {
      course: pathwayData.course,
      steps,
    };
  }
}

export const recommendationService = new RecommendationService();
