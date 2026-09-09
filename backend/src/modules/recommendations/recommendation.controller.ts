import { Request, Response, NextFunction } from 'express';
import { recommendationService } from './recommendation.service';
import { recommendationIdParamSchema, pathwayQuerySchema } from './recommendation.schemas';
import { ApiError } from '../../utils/apiError';

export class RecommendationController {
  /**
   * POST /api/v1/recommendations/generate
   * Generate or refresh recommendations for authenticated trainee
   */
  async generateRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');

      const recommendations = await recommendationService.generateOrRefreshRecommendations(
        req.user.id,
        req.user.organizationId
      );

      res.status(200).json({
        success: true,
        data: recommendations,
        message: 'Recommendations generated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/recommendations/my
   * Get current authenticated trainee's active recommendations
   */
  async getMyRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');

      const recommendations = await recommendationService.getMyActiveRecommendations(
        req.user.id,
        req.user.organizationId
      );

      res.status(200).json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/recommendations/:id/dismiss
   * Dismiss an active recommendation
   */
  async dismissRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');

      const paramResult = recommendationIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        throw ApiError.badRequest('Invalid recommendation ID parameter', 'INVALID_PARAM', paramResult.error.format());
      }

      const dismissed = await recommendationService.dismissRecommendation(
        paramResult.data.id,
        req.user.id,
        req.user.organizationId
      );

      res.status(200).json({
        success: true,
        data: dismissed,
        message: 'Recommendation dismissed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/recommendations/:id/accept
   * Accept recommendation and atomically create enrollment
   */
  async acceptRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');

      const paramResult = recommendationIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        throw ApiError.badRequest('Invalid recommendation ID parameter', 'INVALID_PARAM', paramResult.error.format());
      }

      const forceEnrollmentFailure =
        req.body?.forceEnrollmentFailure === true || req.headers['x-force-rollback'] === 'true';

      const result = await recommendationService.acceptRecommendation(
        paramResult.data.id,
        req.user.id,
        req.user.organizationId,
        { forceEnrollmentFailure }
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Recommendation accepted and enrollment created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/recommendations/pathway
   * Get adaptive learning pathway for course
   */
  async getAdaptivePathway(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Authentication required');

      const queryResult = pathwayQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        throw ApiError.badRequest('Invalid query parameters', 'INVALID_QUERY', queryResult.error.format());
      }

      const pathway = await recommendationService.getAdaptivePathway(
        req.user.id,
        req.user.organizationId,
        queryResult.data.courseId
      );

      res.status(200).json({
        success: true,
        data: pathway,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const recommendationController = new RecommendationController();
