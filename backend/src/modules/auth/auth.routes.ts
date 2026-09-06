import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Public Authentication Endpoints
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Protected User Information Endpoint
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

// Protected RBAC Test Endpoints (Development Verification)
router.get('/test/admin', authenticate, authorize('ADMIN'), (req, res) => authController.testAdmin(req, res));
router.get('/test/trainer', authenticate, authorize('TRAINER', 'ADMIN'), (req, res) => authController.testTrainer(req, res));
router.get('/test/trainee', authenticate, authorize('TRAINEE', 'TRAINER', 'ADMIN'), (req, res) => authController.testTrainee(req, res));

export const authRoutes = router;
