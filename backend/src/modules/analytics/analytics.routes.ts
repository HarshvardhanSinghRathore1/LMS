import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { enforceOrganizationContext } from '../../middleware/organizationContext';

const router = Router();

// Apply auth + tenant middleware to all analytics routes
router.use(authenticate);
router.use(enforceOrganizationContext);

// GET /org-dashboard — ADMIN | TRAINER
router.get(
  '/org-dashboard',
  authorize('ADMIN', 'TRAINER'),
  analyticsController.getOrgDashboard.bind(analyticsController)
);

// GET /trainee-summary — TRAINEE only
router.get(
  '/trainee-summary',
  authorize('TRAINEE'),
  analyticsController.getTraineeSummary.bind(analyticsController)
);

// GET /course-leaderboard — ADMIN | TRAINER
router.get(
  '/course-leaderboard',
  authorize('ADMIN', 'TRAINER'),
  analyticsController.getCourseLeaderboard.bind(analyticsController)
);

// GET /trainee-leaderboard — ADMIN only
router.get(
  '/trainee-leaderboard',
  authorize('ADMIN'),
  analyticsController.getTraineeLeaderboard.bind(analyticsController)
);

// GET /skill-gap-distribution — ADMIN | TRAINER
router.get(
  '/skill-gap-distribution',
  authorize('ADMIN', 'TRAINER'),
  analyticsController.getSkillGapDistribution.bind(analyticsController)
);

// POST /invalidate-snapshot — ADMIN only
router.post(
  '/invalidate-snapshot',
  authorize('ADMIN'),
  analyticsController.invalidateSnapshot.bind(analyticsController)
);

export default router;
