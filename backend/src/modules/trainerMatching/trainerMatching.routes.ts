import { Router } from 'express';
import { trainerMatchingController } from './trainerMatching.controller';
import { authenticate } from '../../middleware/authenticate';
import { enforceOrganizationContext } from '../../middleware/organizationContext';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Apply authentication & tenant isolation middleware to all Stage 8 routes
router.use(authenticate, enforceOrganizationContext);

// --- TRAINEE ENDPOINTS ---
router.get(
  '/matches',
  authorize('TRAINEE'),
  trainerMatchingController.getTrainerMatches
);

router.get(
  '/my-sessions',
  authorize('TRAINEE'),
  trainerMatchingController.getTraineeSessions
);

router.post(
  '/sessions',
  authorize('TRAINEE'),
  trainerMatchingController.createSessionRequest
);

// --- TRAINER PROFILE & EXPERTISE ENDPOINTS (TRAINER ROLE) ---
router.get(
  '/profile/expertise',
  authorize('TRAINER'),
  trainerMatchingController.getTrainerExpertise
);

router.post(
  '/profile/expertise',
  authorize('TRAINER'),
  trainerMatchingController.addTrainerExpertise
);

router.delete(
  '/profile/expertise/:competencyId',
  authorize('TRAINER'),
  trainerMatchingController.removeTrainerExpertise
);

router.get(
  '/profile',
  authorize('TRAINER'),
  trainerMatchingController.getTrainerProfile
);

router.post(
  '/profile',
  authorize('TRAINER'),
  trainerMatchingController.createTrainerProfile
);

router.patch(
  '/profile',
  authorize('TRAINER'),
  trainerMatchingController.updateTrainerProfile
);

// --- TRAINER SESSIONS MANAGEMENT ENDPOINTS (TRAINER ROLE) ---
router.get(
  '/sessions',
  authorize('TRAINER'),
  trainerMatchingController.getTrainerSessions
);

router.post(
  '/sessions/:id/accept',
  authorize('TRAINER'),
  trainerMatchingController.acceptSession
);

router.post(
  '/sessions/:id/decline',
  authorize('TRAINER'),
  trainerMatchingController.declineSession
);

router.post(
  '/sessions/:id/complete',
  authorize('TRAINER'),
  trainerMatchingController.completeSession
);

// --- SESSION CANCELLATION (TRAINEE or TRAINER) ---
router.post(
  '/sessions/:id/cancel',
  authorize('TRAINEE', 'TRAINER'),
  trainerMatchingController.cancelSession
);

export default router;
