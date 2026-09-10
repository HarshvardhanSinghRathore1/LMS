import { Router } from 'express';
import { mediaController, videoUploadMiddleware, pdfUploadMiddleware } from './media.controller';
import { authenticate } from '../../middleware/authenticate';
import { enforceOrganizationContext } from '../../middleware/organizationContext';
import { authorize } from '../../middleware/authorize';

const router = Router({ mergeParams: true });

// All media endpoints require valid JWT authentication and organization context
router.use(authenticate, enforceOrganizationContext);

// --- VIDEO ROUTES ---
router.post(
  '/:courseId/lessons/:lessonId/video/youtube',
  authorize('ADMIN', 'TRAINER'),
  (req, res, next) => mediaController.setYouTubeVideo(req, res).catch(next)
);

router.post(
  '/:courseId/lessons/:lessonId/video/upload',
  authorize('ADMIN', 'TRAINER'),
  videoUploadMiddleware,
  (req, res, next) => mediaController.uploadVideo(req, res).catch(next)
);

router.get(
  '/:courseId/lessons/:lessonId/video',
  authorize('ADMIN', 'TRAINER', 'TRAINEE'),
  (req, res, next) => mediaController.getVideoDetails(req, res).catch(next)
);

router.get(
  '/:courseId/lessons/:lessonId/video/stream',
  authorize('ADMIN', 'TRAINER', 'TRAINEE'),
  (req, res, next) => mediaController.streamVideo(req, res).catch(next)
);

router.delete(
  '/:courseId/lessons/:lessonId/video',
  authorize('ADMIN', 'TRAINER'),
  (req, res, next) => mediaController.deleteVideo(req, res).catch(next)
);

router.post(
  '/:courseId/lessons/:lessonId/video/reprocess',
  authorize('ADMIN', 'TRAINER'),
  (req, res, next) => mediaController.reprocessVideo(req, res).catch(next)
);

// --- PDF RESOURCE ROUTES ---
router.post(
  '/:courseId/lessons/:lessonId/resources',
  authorize('ADMIN', 'TRAINER'),
  pdfUploadMiddleware,
  (req, res, next) => mediaController.uploadResource(req, res).catch(next)
);

router.get(
  '/:courseId/lessons/:lessonId/resources',
  authorize('ADMIN', 'TRAINER', 'TRAINEE'),
  (req, res, next) => mediaController.listResources(req, res).catch(next)
);

router.get(
  '/:courseId/lessons/:lessonId/resources/:resourceId/download',
  authorize('ADMIN', 'TRAINER', 'TRAINEE'),
  (req, res, next) => mediaController.downloadResource(req, res).catch(next)
);

router.delete(
  '/:courseId/lessons/:lessonId/resources/:resourceId',
  authorize('ADMIN', 'TRAINER'),
  (req, res, next) => mediaController.deleteResource(req, res).catch(next)
);

// --- YOUTUBE PLAYLIST IMPORT ---
router.post(
  '/import-playlist',
  authorize('ADMIN', 'TRAINER'),
  (req, res, next) => mediaController.importPlaylist(req, res).catch(next)
);

// --- LESSON NOTES ROUTES ---
router.post(
  '/:courseId/lessons/:lessonId/notes/generate',
  authorize('ADMIN', 'TRAINER'),
  (req, res, next) => mediaController.generateNotes(req, res).catch(next)
);

router.put(
  '/:courseId/lessons/:lessonId/notes',
  authorize('ADMIN', 'TRAINER'),
  (req, res, next) => mediaController.updateNotes(req, res).catch(next)
);

router.get(
  '/:courseId/lessons/:lessonId/notes',
  authorize('ADMIN', 'TRAINER', 'TRAINEE'),
  (req, res, next) => mediaController.getNotes(req, res).catch(next)
);

// --- MEDIA STATUS MONITOR ---
router.get(
  '/:courseId/media-status',
  authorize('ADMIN', 'TRAINER'),
  (req, res, next) => mediaController.getCourseMediaStatus(req, res).catch(next)
);

export const mediaRoutes = router;
