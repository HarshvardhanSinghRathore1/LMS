import { Router } from 'express';
import { competencyController } from './competency.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { enforceOrganizationContext } from '../../middleware/organizationContext';

const router = Router();

// Apply global auth & tenant middleware to all competency routes
router.use(authenticate);
router.use(enforceOrganizationContext);

// 1. Trainee view own competency gaps & proficiency
router.get(
  '/my-gaps',
  authorize('TRAINEE'),
  competencyController.getMyGaps.bind(competencyController)
);

// 2. Admin & Trainer view organization skill gap matrix
router.get(
  '/organization-matrix',
  authorize('ADMIN', 'TRAINER'),
  competencyController.getOrganizationSkillGapMatrix.bind(competencyController)
);

// 3. List competencies
router.get('/', competencyController.listCompetencies.bind(competencyController));

// 4. Create competency (Admin & Trainer)
router.post(
  '/',
  authorize('ADMIN', 'TRAINER'),
  competencyController.createCompetency.bind(competencyController)
);

// 5. Get competency details by ID
router.get('/:id', competencyController.getCompetencyById.bind(competencyController));

// 6. Update competency (Admin & Trainer)
router.patch(
  '/:id',
  authorize('ADMIN', 'TRAINER'),
  competencyController.updateCompetency.bind(competencyController)
);

// 7. Map course to competency (Admin & Trainer)
router.post(
  '/:id/map-course',
  authorize('ADMIN', 'TRAINER'),
  competencyController.mapCourse.bind(competencyController)
);

// 8. Remove course competency mapping (Admin & Trainer)
router.delete(
  '/:id/map-course/:courseId',
  authorize('ADMIN', 'TRAINER'),
  competencyController.removeCourseMapping.bind(competencyController)
);

export default router;
