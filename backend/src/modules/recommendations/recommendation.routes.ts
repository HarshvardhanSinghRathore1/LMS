import { Router } from 'express';
import { recommendationController } from './recommendation.controller';
import { authenticate } from '../../middleware/authenticate';
import { enforceOrganizationContext } from '../../middleware/organizationContext';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Require JWT authentication, Organization tenant context, and TRAINEE role authorization
router.use(authenticate, enforceOrganizationContext, authorize('TRAINEE'));

router.post('/generate', recommendationController.generateRecommendations);
router.get('/my', recommendationController.getMyRecommendations);
router.get('/pathway', recommendationController.getAdaptivePathway);

router.post('/:id/dismiss', recommendationController.dismissRecommendation);
router.post('/:id/accept', recommendationController.acceptRecommendation);

export default router;
