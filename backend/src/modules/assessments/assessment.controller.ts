import { Request, Response, NextFunction } from 'express';
import { assessmentService } from './assessment.service';
import {
  createAssessmentSchema,
  updateAssessmentSchema,
  createQuestionSchema,
  updateQuestionSchema,
  submitAnswersSchema,
  assessmentQuerySchema,
} from './assessment.schemas';

export class AssessmentController {
  /**
   * POST /api/v1/assessments
   * Admin and Trainer create assessment
   */
  async createAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createAssessmentSchema.parse(req.body);
      const organizationId = req.user!.organizationId;
      const creatorId = req.user!.id;

      const assessment = await assessmentService.createAssessment(
        organizationId,
        creatorId,
        validated
      );

      res.status(201).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/assessments
   * List assessments
   */
  async listAssessments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = assessmentQuerySchema.parse(req.query);
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const { assessments, total } = await assessmentService.listAssessments(
        organizationId,
        userId,
        userRole,
        query
      );

      res.status(200).json({
        success: true,
        data: assessments,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/assessments/metrics/organization
   * Admin and Trainer organization metrics
   */
  async getOrganizationMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const metrics = await assessmentService.getOrganizationMetrics(organizationId);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/assessments/:assessmentId
   * Fetch assessment detail and questions (answer key hidden for Trainees)
   */
  async getAssessmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const result = await assessmentService.getAssessmentById(
        organizationId,
        userId,
        userRole,
        assessmentId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/assessments/:assessmentId
   * Admin and Trainer update assessment details
   */
  async updateAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const validated = updateAssessmentSchema.parse(req.body);
      const organizationId = req.user!.organizationId;

      const assessment = await assessmentService.updateAssessment(
        organizationId,
        assessmentId,
        validated
      );

      res.status(200).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/assessments/:assessmentId/publish
   * Admin and Trainer publish assessment
   */
  async publishAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const organizationId = req.user!.organizationId;

      const assessment = await assessmentService.publishAssessment(organizationId, assessmentId);

      res.status(200).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/assessments/:assessmentId/questions
   * Add question to assessment (DRAFT mode)
   */
  async addQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const validated = createQuestionSchema.parse(req.body);
      const organizationId = req.user!.organizationId;

      const question = await assessmentService.addQuestion(organizationId, assessmentId, validated);

      res.status(201).json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/assessments/:assessmentId/questions/:questionId
   * Update question
   */
  async updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assessmentId, questionId } = req.params;
      const validated = updateQuestionSchema.parse(req.body);
      const organizationId = req.user!.organizationId;

      const question = await assessmentService.updateQuestion(
        organizationId,
        assessmentId,
        questionId,
        validated
      );

      res.status(200).json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/assessments/:assessmentId/questions/:questionId
   * Delete question
   */
  async deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assessmentId, questionId } = req.params;
      const organizationId = req.user!.organizationId;

      await assessmentService.deleteQuestion(organizationId, assessmentId, questionId);

      res.status(200).json({
        success: true,
        message: 'Question deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/assessments/:assessmentId/start
   * Trainee starts an assessment attempt
   */
  async startAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const organizationId = req.user!.organizationId;
      const traineeId = req.user!.id;

      const attempt = await assessmentService.startAttempt(
        organizationId,
        traineeId,
        assessmentId
      );

      res.status(201).json({
        success: true,
        data: attempt,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/assessments/:assessmentId/attempts/:submissionId/submit
   * Trainee submits assessment attempt for automated grading
   */
  async submitAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { submissionId } = req.params;
      const validated = submitAnswersSchema.parse(req.body);
      const organizationId = req.user!.organizationId;
      const traineeId = req.user!.id;

      const submission = await assessmentService.submitAttempt(
        organizationId,
        traineeId,
        submissionId,
        validated.answers
      );

      res.status(200).json({
        success: true,
        data: submission,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/assessments/:assessmentId/results
   * View assessment results (Trainee views own, Admin/Trainer views org)
   */
  async getResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const submissions = await assessmentService.getResults(
        organizationId,
        userId,
        userRole,
        assessmentId
      );

      res.status(200).json({
        success: true,
        data: submissions,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const assessmentController = new AssessmentController();
