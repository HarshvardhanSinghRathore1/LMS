import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { competencyRepository } from './competency.repository';
import { ApiError } from '../../utils/apiError';
import {
  CompetencyRecord,
  CourseCompetencyRecord,
  TraineeCompetencyRecord,
  ProficiencyLevel,
  OrganizationSkillGapMatrix,
} from './competency.types';
import {
  CreateCompetencyInput,
  UpdateCompetencyInput,
  MapCourseInput,
  CompetencyQueryInput,
} from './competency.schemas';

export class CompetencyService {
  /**
   * Determine Proficiency Level from score according to boundary rules:
   * 0.00 - 39.99  NOVICE
   * 40.00 - 69.99 INTERMEDIATE
   * 70.00 - 89.99 ADVANCED
   * 90.00 - 100.00 EXPERT
   */
  calculateProficiencyLevel(score: number): ProficiencyLevel {
    if (score >= 90.0) return 'EXPERT';
    if (score >= 70.0) return 'ADVANCED';
    if (score >= 40.0) return 'INTERMEDIATE';
    return 'NOVICE';
  }

  /**
   * Calculate Skill Gap Percentage:
   * MAX(0, targetScorePercentage - currentScorePercentage)
   */
  calculateSkillGap(targetScorePercentage: number, currentScorePercentage: number): number {
    const gap = targetScorePercentage - currentScorePercentage;
    return Number(Math.max(0, gap).toFixed(2));
  }

  /**
   * Calculate Course-level Competency Score using locked 70/30 Policy:
   * - 70% Assessment Performance
   * - 30% Course Lesson Progress
   *
   * Fallback rules:
   * - Both available: assessmentScore * 0.70 + lessonProgress * 0.30
   * - Only Assessment available: assessmentScore
   * - Only Lesson Progress available: lessonProgress
   * - Neither available: 0.00
   */
  calculateCourseCompetencyScore(
    assessmentScore: number | null,
    lessonProgress: number | null
  ): number {
    const hasAss = assessmentScore !== null && !isNaN(assessmentScore);
    const hasProg = lessonProgress !== null && !isNaN(lessonProgress);

    if (hasAss && hasProg) {
      return Number((assessmentScore! * 0.7 + lessonProgress! * 0.3).toFixed(2));
    }
    if (hasAss) {
      return Number(assessmentScore!.toFixed(2));
    }
    if (hasProg) {
      return Number(lessonProgress!.toFixed(2));
    }
    return 0.0;
  }

  /**
   * Create a new competency (Admin & Trainer)
   */
  async createCompetency(
    organizationId: string,
    input: CreateCompetencyInput
  ): Promise<CompetencyRecord> {
    const existing = await competencyRepository.findCompetencyByCode(input.code, organizationId);
    if (existing) {
      throw ApiError.conflict(
        `Competency with code '${input.code}' already exists in your organization`,
        'COMPETENCY_CODE_EXISTS'
      );
    }

    return competencyRepository.createCompetency({
      organizationId,
      code: input.code,
      name: input.name,
      description: input.description,
      category: input.category,
      targetScorePercentage: input.targetScorePercentage,
    });
  }

  /**
   * List competencies (Admin, Trainer, Trainee)
   */
  async listCompetencies(
    organizationId: string,
    query: CompetencyQueryInput
  ): Promise<{ competencies: CompetencyRecord[]; total: number }> {
    return competencyRepository.listCompetencies(organizationId, query);
  }

  /**
   * Get competency by ID
   */
  async getCompetencyById(
    competencyId: string,
    organizationId: string
  ): Promise<CompetencyRecord> {
    const competency = await competencyRepository.findCompetencyById(competencyId, organizationId);
    if (!competency) {
      throw ApiError.notFound('Competency not found or access forbidden');
    }
    return competency;
  }

  /**
   * Update competency details
   */
  async updateCompetency(
    competencyId: string,
    organizationId: string,
    input: UpdateCompetencyInput
  ): Promise<CompetencyRecord> {
    const competency = await competencyRepository.findCompetencyById(competencyId, organizationId);
    if (!competency) {
      throw ApiError.notFound('Competency not found or access forbidden');
    }

    if (input.code && input.code !== competency.code) {
      const existing = await competencyRepository.findCompetencyByCode(input.code, organizationId);
      if (existing) {
        throw ApiError.conflict(
          `Competency with code '${input.code}' already exists in your organization`,
          'COMPETENCY_CODE_EXISTS'
        );
      }
    }

    const updated = await competencyRepository.updateCompetency(
      competencyId,
      organizationId,
      input
    );
    if (!updated) {
      throw ApiError.notFound('Failed to update competency');
    }
    return updated;
  }

  /**
   * Map competency to course (Admin & Trainer)
   */
  async mapCourseToCompetency(
    competencyId: string,
    organizationId: string,
    input: MapCourseInput
  ): Promise<CourseCompetencyRecord> {
    // 1. Verify competency exists in organization
    const competency = await competencyRepository.findCompetencyById(competencyId, organizationId);
    if (!competency) {
      throw ApiError.notFound('Competency not found or access forbidden');
    }

    // 2. Map competency to course
    try {
      return await competencyRepository.mapCourseToCompetency({
        organizationId,
        competencyId,
        courseId: input.courseId,
        weight: input.weight,
      });
    } catch (err: any) {
      if (err.code === '23503') { // Foreign key constraint error
        throw ApiError.notFound('Course not found or access forbidden');
      }
      if (err.code === '23505') { // Duplicate unique constraint error
        throw ApiError.conflict('This course is already mapped to the competency', 'MAPPING_ALREADY_EXISTS');
      }
      throw err;
    }
  }

  /**
   * Remove course-competency mapping
   */
  async removeCourseMapping(
    competencyId: string,
    courseId: string,
    organizationId: string
  ): Promise<boolean> {
    const competency = await competencyRepository.findCompetencyById(competencyId, organizationId);
    if (!competency) {
      throw ApiError.notFound('Competency not found or access forbidden');
    }

    const removed = await competencyRepository.removeCourseMapping(
      competencyId,
      courseId,
      organizationId
    );
    if (!removed) {
      throw ApiError.notFound('Course competency mapping not found');
    }
    return true;
  }

  /**
   * Get evaluated competency gaps for authenticated trainee
   */
  async getMyCompetencyGaps(
    traineeId: string,
    organizationId: string
  ): Promise<TraineeCompetencyRecord[]> {
    return competencyRepository.findTraineeCompetencies(traineeId, organizationId);
  }

  /**
   * Get organization Skill Gap Matrix for Admin and Trainer
   */
  async getOrganizationSkillGapMatrix(
    organizationId: string
  ): Promise<OrganizationSkillGapMatrix> {
    return competencyRepository.getOrganizationSkillGapMatrix(organizationId);
  }

  /**
   * Transactional Competency Reevaluation Engine
   * Executes synchronously inside the SAME PostgreSQL transaction as Assessment Submission / Lesson Progress!
   */
  async reevaluateTraineeCompetencies(
    clientOrPool: PoolClient | typeof pool,
    traineeId: string,
    organizationId: string,
    triggerCourseId?: string
  ): Promise<TraineeCompetencyRecord[]> {
    // 1. Identify target competencies to reevaluate
    let targetCompetencies: { id: string; target_score_percentage: number }[] = [];

    if (triggerCourseId) {
      const mapped = await competencyRepository.listCompetenciesMappedToCourse(
        triggerCourseId,
        organizationId,
        clientOrPool as any
      );
      targetCompetencies = mapped.map((m: { competency_id: string; target_score_percentage: number }) => ({
        id: m.competency_id,
        target_score_percentage: Number(m.target_score_percentage || 75.0),
      }));
    } else {
      const allComp = await competencyRepository.listCompetencies(organizationId, {
        page: 1,
        limit: 1000,
      });
      targetCompetencies = allComp.competencies.map((c: CompetencyRecord) => ({
        id: c.id,
        target_score_percentage: Number(c.target_score_percentage),
      }));
    }

    if (targetCompetencies.length === 0) {
      return [];
    }

    const updatedSnapshots: TraineeCompetencyRecord[] = [];

    // 2. Evaluate each target competency
    for (const comp of targetCompetencies) {
      const mappedCourses = await competencyRepository.getCoursesMappedToCompetency(
        comp.id,
        organizationId,
        clientOrPool as any
      );

      let competencyScore = 0.0;

      if (mappedCourses.length > 0) {
        const totalWeight = mappedCourses.reduce((acc: number, c: { weight: number }) => acc + c.weight, 0);

        if (totalWeight > 0) {
          let weightedSum = 0.0;

          for (const mappedCourse of mappedCourses) {
            const { assessmentScore, lessonProgress } =
              await competencyRepository.getCourseScoresForTrainee(
                clientOrPool,
                traineeId,
                mappedCourse.course_id,
                organizationId
              );

            const courseScore = this.calculateCourseCompetencyScore(
              assessmentScore,
              lessonProgress
            );
            weightedSum += courseScore * (mappedCourse.weight / totalWeight);
          }

          competencyScore = Number(Math.min(100.0, Math.max(0.0, weightedSum)).toFixed(2));
        }
      }

      // 3. Compute proficiency level & skill gap
      const proficiencyLevel = this.calculateProficiencyLevel(competencyScore);
      const gapPercentage = this.calculateSkillGap(
        comp.target_score_percentage,
        competencyScore
      );

      // 4. Upsert snapshot into database
      const snapshot = await competencyRepository.upsertTraineeCompetency(clientOrPool, {
        organizationId,
        traineeId,
        competencyId: comp.id,
        currentScorePercentage: competencyScore,
        proficiencyLevel,
        gapPercentage,
      });

      updatedSnapshots.push(snapshot);
    }

    return updatedSnapshots;
  }
}

export const competencyService = new CompetencyService();
