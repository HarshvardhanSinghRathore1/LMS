import { Request, Response, NextFunction } from 'express';
import { enrollmentService } from './enrollment.service';
import {
  createEnrollmentSchema,
  listEnrollmentsQuerySchema,
  lessonCompletionSchema,
} from './enrollment.schemas';

export class EnrollmentController {
  /**
   * POST /api/v1/enrollments
   * Trainees enroll in a published course
   */
  async createEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedBody = createEnrollmentSchema.parse(req.body);
      const organizationId = req.user!.organizationId;
      const traineeId = req.user!.id;

      const enrollment = await enrollmentService.createEnrollment(
        organizationId,
        traineeId,
        validatedBody.courseId
      );

      res.status(201).json({
        success: true,
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/enrollments
   * Trainees list their own enrollments
   */
  async listMyEnrollments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listEnrollmentsQuerySchema.parse(req.query);
      const organizationId = req.user!.organizationId;
      const traineeId = req.user!.id;

      const { enrollments, total } = await enrollmentService.listMyEnrollments(
        organizationId,
        traineeId,
        query
      );

      res.status(200).json({
        success: true,
        data: enrollments,
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
   * GET /api/v1/enrollments/metrics/organization
   * Admins and Trainers view organization-level learning metrics
   */
  async getOrganizationMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const metrics = await enrollmentService.getOrganizationMetrics(organizationId);

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/enrollments/:enrollmentId
   * Fetch detail of an enrollment
   */
  async getEnrollmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enrollmentId } = req.params;
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const result = await enrollmentService.getEnrollmentById(
        organizationId,
        userId,
        userRole,
        enrollmentId
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
   * POST /api/v1/enrollments/:enrollmentId/lessons/:lessonId/complete
   * Mark lesson completed
   */
  async markLessonComplete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enrollmentId, lessonId } = req.params;
      const organizationId = req.user!.organizationId;
      const traineeId = req.user!.id;

      const result = await enrollmentService.updateLessonProgress(
        organizationId,
        traineeId,
        enrollmentId,
        lessonId,
        true
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
   * POST /api/v1/enrollments/:enrollmentId/lessons/:lessonId/uncomplete
   * Mark lesson uncompleted
   */
  async markLessonUncomplete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enrollmentId, lessonId } = req.params;
      const organizationId = req.user!.organizationId;
      const traineeId = req.user!.id;

      const result = await enrollmentService.updateLessonProgress(
        organizationId,
        traineeId,
        enrollmentId,
        lessonId,
        false
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
   * POST /api/v1/enrollments/:enrollmentId/drop
   * Drop course enrollment
   */
  async dropEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enrollmentId } = req.params;
      const organizationId = req.user!.organizationId;
      const traineeId = req.user!.id;

      const enrollment = await enrollmentService.dropEnrollment(
        organizationId,
        traineeId,
        enrollmentId
      );

      res.status(200).json({
        success: true,
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const enrollmentController = new EnrollmentController();
