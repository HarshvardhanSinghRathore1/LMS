import { Router } from 'express';
import { healthController } from './health.controller';
import { aiController } from '../ai/ai.controller';

const router = Router();

router.get('/', (req, res, next) => healthController.checkHealth(req, res, next));
router.get('/ai', (req, res, next) => aiController.getHealth(req, res, next));

export const healthRoutes = router;
