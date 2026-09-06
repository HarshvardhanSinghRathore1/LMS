import { Router } from 'express';
import { assessmentController } from './assessment.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { enforceOrganizationContext } from '../../middleware/organizationContext';

const router = Router();

// Apply global auth & tenant middleware
router.use(authenticate);
router.use(enforceOrganizationContext);

// Organization metrics for Admin & Trainer
router.get(
  '/metrics/organization',
  authorize('ADMIN', 'TRAINER'),
  assessmentController.getOrganizationMetrics.bind(assessmentController)
);

// Create assessment (Admin & Trainer)
router.post(
  '/',
  authorize('ADMIN', 'TRAINER'),
  assessmentController.createAssessment.bind(assessmentController)
);

// List assessments
router.get(
  '/',
  assessmentController.listAssessments.bind(assessmentController)
);

// Get assessment detail & questions
router.get(
  '/:assessmentId',
  assessmentController.getAssessmentById.bind(assessmentController)
);

// Update assessment details (Admin & Trainer)
router.patch(
  '/:assessmentId',
  authorize('ADMIN', 'TRAINER'),
  assessmentController.updateAssessment.bind(assessmentController)
);

// Publish assessment (Admin & Trainer)
router.post(
  '/:assessmentId/publish',
  authorize('ADMIN', 'TRAINER'),
  assessmentController.publishAssessment.bind(assessmentController)
);

// Add question to assessment (Admin & Trainer)
router.post(
  '/:assessmentId/questions',
  authorize('ADMIN', 'TRAINER'),
  assessmentController.addQuestion.bind(assessmentController)
);

// Update question (Admin & Trainer)
router.patch(
  '/:assessmentId/questions/:questionId',
  authorize('ADMIN', 'TRAINER'),
  assessmentController.updateQuestion.bind(assessmentController)
);

// Delete question (Admin & Trainer)
router.delete(
  '/:assessmentId/questions/:questionId',
  authorize('ADMIN', 'TRAINER'),
  assessmentController.deleteQuestion.bind(assessmentController)
);

// Start assessment attempt (Trainees only)
router.post(
  '/:assessmentId/start',
  authorize('TRAINEE'),
  assessmentController.startAttempt.bind(assessmentController)
);

// Submit assessment attempt for grading (Trainees only)
router.post(
  '/:assessmentId/attempts/:submissionId/submit',
  authorize('TRAINEE'),
  assessmentController.submitAttempt.bind(assessmentController)
);

// Get assessment results
router.get(
  '/:assessmentId/results',
  assessmentController.getResults.bind(assessmentController)
);

export default router;
