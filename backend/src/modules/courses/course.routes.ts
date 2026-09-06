import { Router } from 'express';
import { courseController } from './course.controller';
import { authenticate } from '../../middleware/authenticate';
import { enforceOrganizationContext } from '../../middleware/organizationContext';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All course routes require valid JWT authentication and authoritative organization context
router.use(authenticate, enforceOrganizationContext);

// --- COURSE READ ROUTES (Available to ADMIN, TRAINER, and TRAINEE) ---
router.get('/', authorize('ADMIN', 'TRAINER', 'TRAINEE'), (req, res, next) => courseController.list(req, res, next));
router.get('/:courseId', authorize('ADMIN', 'TRAINER', 'TRAINEE'), (req, res, next) => courseController.getById(req, res, next));

// --- COURSE CREATION & PUBLISHING (ADMIN & TRAINER ONLY) ---
router.post('/', authorize('ADMIN', 'TRAINER'), (req, res, next) => courseController.create(req, res, next));
router.patch('/:courseId', authorize('ADMIN', 'TRAINER'), (req, res, next) => courseController.update(req, res, next));
router.post('/:courseId/publish', authorize('ADMIN', 'TRAINER'), (req, res, next) => courseController.publish(req, res, next));
router.delete('/:courseId', authorize('ADMIN', 'TRAINER'), (req, res, next) => courseController.archive(req, res, next));

// --- MODULE ROUTES (ADMIN & TRAINER ONLY) ---
router.post('/:courseId/modules', authorize('ADMIN', 'TRAINER'), (req, res, next) => courseController.createModule(req, res, next));
router.patch('/modules/:moduleId', authorize('ADMIN', 'TRAINER'), (req, res, next) => courseController.updateModule(req, res, next));
router.delete('/modules/:moduleId', authorize('ADMIN', 'TRAINER'), (req, res, next) => courseController.deleteModule(req, res, next));

// --- LESSON ROUTES (ADMIN & TRAINER ONLY) ---
router.post('/modules/:moduleId/lessons', authorize('ADMIN', 'TRAINER'), (req, res, next) => courseController.createLesson(req, res, next));
router.patch('/lessons/:lessonId', authorize('ADMIN', 'TRAINER'), (req, res, next) => courseController.updateLesson(req, res, next));
router.delete('/lessons/:lessonId', authorize('ADMIN', 'TRAINER'), (req, res, next) => courseController.deleteLesson(req, res, next));

export const courseRoutes = router;
