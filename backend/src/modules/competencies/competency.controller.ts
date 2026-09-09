import { Request, Response, NextFunction } from 'express';
import { competencyService } from './competency.service';
import {
  createCompetencySchema,
  updateCompetencySchema,
  mapCourseSchema,
  competencyQuerySchema,
} from './competency.schemas';

export class CompetencyController {
  /**
   * POST /api/v1/competencies
   * Admin and Trainer create competency
   */
  async createCompetency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createCompetencySchema.parse(req.body);
      const organizationId = req.user!.organizationId;

      const competency = await competencyService.createCompetency(organizationId, validated);

      res.status(201).json({
        success: true,
        data: competency,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/competencies
   * List competencies in organization
   */
  async listCompetencies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = competencyQuerySchema.parse(req.query);
      const organizationId = req.user!.organizationId;

      const { competencies, total } = await competencyService.listCompetencies(organizationId, query);

      res.status(200).json({
        success: true,
        data: competencies,
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
   * GET /api/v1/competencies/my-gaps
   * Trainee views their own evaluated competencies & skill gaps
   */
  async getMyGaps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;
      const traineeId = req.user!.id; // Derived strictly from verified JWT!

      const gaps = await competencyService.getMyCompetencyGaps(traineeId, organizationId);

      res.status(200).json({
        success: true,
        data: gaps,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/competencies/organization-matrix
   * Admin and Trainer view Organization Skill Gap Matrix Heatmap
   */
  async getOrganizationSkillGapMatrix(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organizationId = req.user!.organizationId;

      const matrix = await competencyService.getOrganizationSkillGapMatrix(organizationId);

      res.status(200).json({
        success: true,
        data: matrix,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/competencies/:id
   * Get single competency details
   */
  async getCompetencyById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      const competency = await competencyService.getCompetencyById(id, organizationId);

      res.status(200).json({
        success: true,
        data: competency,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/competencies/:id
   * Update competency details (Admin & Trainer)
   */
  async updateCompetency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateCompetencySchema.parse(req.body);
      const organizationId = req.user!.organizationId;

      const updated = await competencyService.updateCompetency(id, organizationId, validated);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/competencies/:id/map-course
   * Map competency to course with weight (Admin & Trainer)
   */
  async mapCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validated = mapCourseSchema.parse(req.body);
      const organizationId = req.user!.organizationId;

      const mapping = await competencyService.mapCourseToCompetency(id, organizationId, validated);

      res.status(201).json({
        success: true,
        data: mapping,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/competencies/:id/map-course/:courseId
   * Remove course-competency mapping (Admin & Trainer)
   */
  async removeCourseMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, courseId } = req.params;
      const organizationId = req.user!.organizationId;

      await competencyService.removeCourseMapping(id, courseId, organizationId);

      res.status(200).json({
        success: true,
        message: 'Course competency mapping removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const competencyController = new CompetencyController();
