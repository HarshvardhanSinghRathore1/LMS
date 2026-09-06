import { Router } from 'express';
import { enrollmentController } from './enrollment.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { enforceOrganizationContext } from '../../middleware/organizationContext';

const router = Router();

// Apply global auth & tenant middleware to all enrollment routes
router.use(authenticate);
router.use(enforceOrganizationContext);

// Organization metrics for Admin & Trainer
router.get(
  '/metrics/organization',
  authorize('ADMIN', 'TRAINER'),
  enrollmentController.getOrganizationMetrics.bind(enrollmentController)
);

// Enroll in a published course (Trainees only)
router.post(
  '/',
  authorize('TRAINEE'),
  enrollmentController.createEnrollment.bind(enrollmentController)
);

// List current trainee's enrollments
router.get(
  '/',
  authorize('TRAINEE'),
  enrollmentController.listMyEnrollments.bind(enrollmentController)
);

// Get enrollment detail by ID
router.get(
  '/:enrollmentId',
  enrollmentController.getEnrollmentById.bind(enrollmentController)
);

// Mark lesson complete
router.post(
  '/:enrollmentId/lessons/:lessonId/complete',
  authorize('TRAINEE'),
  enrollmentController.markLessonComplete.bind(enrollmentController)
);

// Mark lesson uncomplete
router.post(
  '/:enrollmentId/lessons/:lessonId/uncomplete',
  authorize('TRAINEE'),
  enrollmentController.markLessonUncomplete.bind(enrollmentController)
);

// Drop enrollment
router.post(
  '/:enrollmentId/drop',
  authorize('TRAINEE'),
  enrollmentController.dropEnrollment.bind(enrollmentController)
);

export default router;
