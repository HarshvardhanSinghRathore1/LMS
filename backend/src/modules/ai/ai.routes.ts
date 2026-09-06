import { Router } from 'express';
import { aiController } from './ai.controller';

const router = Router();

router.get('/providers', (req, res, next) => aiController.getProviders(req, res, next));
router.post('/test', (req, res, next) => aiController.testAI(req, res, next));

export const aiRoutes = router;
