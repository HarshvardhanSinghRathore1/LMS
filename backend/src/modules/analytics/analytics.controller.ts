// =====================================================================
// analytics.controller.ts  — Stage 10 Analytics Controller
// Translates HTTP into service calls; never exposes SQL or internals.
// =====================================================================

import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { LeaderboardQuerySchema } from './analytics.schemas';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';

class AnalyticsController {
  // GET /api/v1/analytics/org-dashboard
  // ADMIN | TRAINER
  async getOrgDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const metrics = await analyticsService.getOrgDashboard(orgId);
      sendSuccess(res, metrics, { message: 'Organization dashboard metrics retrieved successfully' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/analytics/trainee-summary
  // TRAINEE only — traineeId always comes from JWT
  async getTraineeSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const traineeId = req.user!.id;
      const summary = await analyticsService.getTraineeSummary(orgId, traineeId);
      sendSuccess(res, summary, { message: 'Trainee personal summary retrieved successfully' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/analytics/course-leaderboard?limit=10
  // ADMIN | TRAINER
  async getCourseLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = LeaderboardQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(ApiError.badRequest(parsed.error.errors[0]?.message || 'Invalid query', 'VALIDATION_ERROR'));
        return;
      }
      const orgId = req.user!.organizationId;
      const leaderboard = await analyticsService.getCourseLeaderboard(orgId, parsed.data.limit);
      sendSuccess(res, { leaderboard, limit: parsed.data.limit }, { message: 'Course leaderboard retrieved successfully' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/analytics/trainee-leaderboard?limit=10
  // ADMIN only
  async getTraineeLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = LeaderboardQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        next(ApiError.badRequest(parsed.error.errors[0]?.message || 'Invalid query', 'VALIDATION_ERROR'));
        return;
      }
      const orgId = req.user!.organizationId;
      const leaderboard = await analyticsService.getTraineeLeaderboard(orgId, parsed.data.limit);
      sendSuccess(res, { leaderboard, limit: parsed.data.limit }, { message: 'Trainee leaderboard retrieved successfully' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/analytics/skill-gap-distribution
  // ADMIN | TRAINER
  async getSkillGapDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const distribution = await analyticsService.getSkillGapDistribution(orgId);
      sendSuccess(res, { distribution }, { message: 'Skill gap distribution retrieved successfully' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/analytics/invalidate-snapshot
  // ADMIN only
  async invalidateSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      await analyticsService.invalidateSnapshot(orgId, {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
      });
      sendSuccess(res, { invalidated: true }, { message: 'Analytics snapshot invalidated. Next dashboard request will recompute from source tables.' });
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
