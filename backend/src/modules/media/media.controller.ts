import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { mediaService } from './media.service';
import { ApiError } from '../../utils/apiError';
import { pool } from '../../config/database';
import { LessonResourceRecord } from '../courses/course.types';

// Ensure base upload directory exists
const BASE_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'course-media');
if (!fs.existsSync(BASE_UPLOAD_DIR)) {
  fs.mkdirSync(BASE_UPLOAD_DIR, { recursive: true });
}

// Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orgId = req.user?.organizationId || 'default';
    const courseId = req.params.courseId || 'unknown-course';
    const lessonId = req.params.lessonId || 'unknown-lesson';
    const subFolder = file.fieldname === 'video' ? 'videos' : 'resources';

    const targetDir = path.join(BASE_UPLOAD_DIR, orgId, courseId, lessonId, subFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

export const videoUploadMiddleware = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedExts = ['.mp4', '.webm', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Allowed formats: MP4, WebM, QuickTime (.mov)'));
    }
  },
}).single('video');

export const pdfUploadMiddleware = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF documents are allowed.'));
    }
  },
}).single('pdf');

export class MediaController {
  /**
   * POST /api/v1/courses/:courseId/lessons/:lessonId/video/youtube
   * Set YouTube Video or Playlist URL
   */
  async setYouTubeVideo(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const { url } = req.body;
    const orgId = req.user!.organizationId;

    if (!url) {
      throw ApiError.badRequest('YouTube URL is required', 'URL_REQUIRED');
    }

    const updatedLesson = await mediaService.setLessonYouTubeVideo(orgId, courseId, lessonId, url);

    res.status(200).json({
      status: 'success',
      data: {
        lesson: updatedLesson,
      },
    });
  }

  /**
   * POST /api/v1/courses/:courseId/lessons/:lessonId/video/upload
   * Upload video file (MP4, WebM, MOV)
   */
  async uploadVideo(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const orgId = req.user!.organizationId;

    if (!req.file) {
      throw ApiError.badRequest('No video file uploaded', 'FILE_REQUIRED');
    }

    const updatedLesson = await mediaService.saveUploadedVideo(orgId, courseId, lessonId, req.file);

    res.status(200).json({
      status: 'success',
      data: {
        lesson: updatedLesson,
        message: 'Video uploaded successfully. Transcription and indexing started in background.',
      },
    });
  }

  /**
   * GET /api/v1/courses/:courseId/lessons/:lessonId/video
   * Get lesson video details & transcript
   */
  async getVideoDetails(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Check media authorization
    await mediaService.authorizeMediaAccess(orgId, userId, userRole, courseId);

    const lessonData = await mediaService.findLessonWithCourse(orgId, courseId, lessonId);
    if (!lessonData) {
      throw ApiError.notFound('Lesson not found in your organization', 'LESSON_NOT_FOUND');
    }

    const { lesson } = lessonData;

    res.status(200).json({
      status: 'success',
      data: {
        videoUrl: lesson.video_url,
        videoSourceType: lesson.video_source_type,
        videoMetadata: lesson.video_metadata,
        transcriptionStatus: lesson.transcription_status,
        transcriptText: lesson.transcript_text,
        transcriptMetadata: lesson.transcript_metadata,
      },
    });
  }

  /**
   * GET /api/v1/courses/:courseId/lessons/:lessonId/video/stream
   * Stream uploaded video with HTTP 206 Byte Range support
   */
  async streamVideo(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // 1. Authorize media access
    await mediaService.authorizeMediaAccess(orgId, userId, userRole, courseId);

    const lessonData = await mediaService.findLessonWithCourse(orgId, courseId, lessonId);
    if (!lessonData) {
      throw ApiError.notFound('Lesson not found', 'LESSON_NOT_FOUND');
    }

    const { lesson } = lessonData;

    if (lesson.video_source_type !== 'UPLOADED' || !lesson.video_metadata?.relativePath) {
      throw ApiError.badRequest('This lesson does not have an uploaded video file to stream', 'NO_UPLOADED_VIDEO');
    }

    const filePath = path.resolve(process.cwd(), lesson.video_metadata.relativePath);
    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound('Video file not found on disk', 'FILE_NOT_FOUND');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const mimeType = lesson.video_metadata.mimeType || 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send(`Requested range not satisfiable: ${start} >= ${fileSize}`);
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  }

  /**
   * DELETE /api/v1/courses/:courseId/lessons/:lessonId/video
   * Remove video from lesson and delete stale vectors
   */
  async deleteVideo(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const orgId = req.user!.organizationId;

    const updated = await mediaService.deleteLessonVideo(orgId, courseId, lessonId);

    res.status(200).json({
      status: 'success',
      data: {
        lesson: updated,
        message: 'Video and associated knowledge vectors removed successfully.',
      },
    });
  }

  /**
   * POST /api/v1/courses/:courseId/lessons/:lessonId/video/reprocess
   * Retry video transcription & RAG indexing
   */
  async reprocessVideo(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const orgId = req.user!.organizationId;

    const lessonData = await mediaService.findLessonWithCourse(orgId, courseId, lessonId);
    if (!lessonData) {
      throw ApiError.notFound('Lesson not found', 'LESSON_NOT_FOUND');
    }

    const { lesson } = lessonData;
    if (lesson.video_source_type !== 'UPLOADED' || !lesson.video_metadata?.relativePath) {
      throw ApiError.badRequest('Can only reprocess uploaded videos', 'INVALID_OPERATION');
    }

    const fullPath = path.resolve(process.cwd(), lesson.video_metadata.relativePath);
    if (!fs.existsSync(fullPath)) {
      throw ApiError.notFound('Video file not found on disk', 'FILE_NOT_FOUND');
    }

    // Trigger processing
    setImmediate(() => {
      mediaService.processVideoSTTAndRAG({
        organizationId: orgId,
        courseId,
        lessonId,
        filePath: fullPath,
        mimeType: lesson.video_metadata.mimeType || 'video/mp4',
        fileName: lesson.video_metadata.originalName || 'video.mp4',
      }).catch((err) => {
        console.error('Reprocess failed:', err);
      });
    });

    res.status(200).json({
      status: 'success',
      message: 'Video re-processing started.',
    });
  }

  /**
   * POST /api/v1/courses/:courseId/lessons/:lessonId/resources
   * Upload PDF resource
   */
  async uploadResource(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const { title } = req.body;
    const orgId = req.user!.organizationId;

    if (!req.file) {
      throw ApiError.badRequest('No PDF file uploaded', 'FILE_REQUIRED');
    }

    const resource = await mediaService.saveLessonPdfResource(
      orgId,
      courseId,
      lessonId,
      req.file,
      title
    );

    res.status(201).json({
      status: 'success',
      data: {
        resource,
        message: 'PDF uploaded successfully. Text extraction and RAG indexing started in background.',
      },
    });
  }

  /**
   * GET /api/v1/courses/:courseId/lessons/:lessonId/resources
   * List PDF resources for lesson
   */
  async listResources(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Check media access authorization
    await mediaService.authorizeMediaAccess(orgId, userId, userRole, courseId);

    const resources = await mediaService.listLessonResources(orgId, courseId, lessonId);

    res.status(200).json({
      status: 'success',
      data: {
        resources,
      },
    });
  }

  /**
   * GET /api/v1/courses/:courseId/lessons/:lessonId/resources/:resourceId/download
   * Download / View PDF resource securely
   */
  async downloadResource(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId, resourceId } = req.params;
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // 1. Authorize media access
    await mediaService.authorizeMediaAccess(orgId, userId, userRole, courseId);

    const resQuery = await pool.query<LessonResourceRecord>(
      `SELECT * FROM lesson_resources WHERE id = $1 AND organization_id = $2 AND course_id = $3 AND lesson_id = $4;`,
      [resourceId, orgId, courseId, lessonId]
    );

    if (resQuery.rows.length === 0) {
      throw ApiError.notFound('Resource not found in your organization', 'RESOURCE_NOT_FOUND');
    }

    const resource = resQuery.rows[0];
    const fullPath = path.resolve(process.cwd(), resource.file_url);

    if (!fs.existsSync(fullPath)) {
      throw ApiError.notFound('Resource file not found on disk', 'FILE_NOT_FOUND');
    }

    const stat = fs.statSync(fullPath);
    res.setHeader('Content-Type', resource.mime_type || 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resource.title || 'document.pdf')}"`);

    fs.createReadStream(fullPath).pipe(res);
  }

  /**
   * DELETE /api/v1/courses/:courseId/lessons/:lessonId/resources/:resourceId
   * Delete PDF resource and clean vectors
   */
  async deleteResource(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId, resourceId } = req.params;
    const orgId = req.user!.organizationId;

    const result = await mediaService.deleteLessonResource(orgId, courseId, lessonId, resourceId);

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Resource and associated knowledge vectors deleted successfully.',
    });
  }

  /**
   * POST /api/v1/courses/import-playlist
   * Import YouTube Playlist and Create Complete Course Structure
   */
  async importPlaylist(req: Request, res: Response): Promise<void> {
    const { playlistUrl, category, difficultyLevel } = req.body;
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;

    if (!playlistUrl) {
      throw ApiError.badRequest('YouTube Playlist URL is required', 'PLAYLIST_URL_REQUIRED');
    }

    const result = await mediaService.importYouTubePlaylistAndCreateCourse(
      orgId,
      userId,
      playlistUrl,
      category,
      difficultyLevel
    );

    const statusCode = result.duplicate ? 200 : 201;
    res.status(statusCode).json({
      status: 'success',
      data: result,
      duplicate: result.duplicate,
      message: result.message,
    });
  }

  /**
   * POST /api/v1/courses/:courseId/lessons/:lessonId/notes/generate
   * Generate Lesson Notes from Grounded Sources (Transcript, Lesson Body, PDFs)
   */
  async generateNotes(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const orgId = req.user!.organizationId;

    const result = await mediaService.generateLessonNotes(orgId, courseId, lessonId);

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Lesson notes generated successfully from verified course content.',
    });
  }

  /**
   * PUT /api/v1/courses/:courseId/lessons/:lessonId/notes
   * Manually edit and save lesson notes
   */
  async updateNotes(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const { notes } = req.body;
    const orgId = req.user!.organizationId;

    if (notes === undefined || notes === null) {
      throw ApiError.badRequest('Notes text is required', 'NOTES_REQUIRED');
    }

    const result = await mediaService.updateLessonNotes(orgId, courseId, lessonId, notes);

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Lesson notes updated and re-indexed successfully.',
    });
  }

  /**
   * GET /api/v1/courses/:courseId/lessons/:lessonId/notes
   * Get lesson notes and status
   */
  async getNotes(req: Request, res: Response): Promise<void> {
    const { courseId, lessonId } = req.params;
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify media/course access
    await mediaService.authorizeMediaAccess(orgId, userId, userRole, courseId);

    const result = await mediaService.getLessonNotes(orgId, courseId, lessonId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }

  /**
   * GET /api/v1/courses/:courseId/media-status
   * Get all media processing statuses for a course
   */
  async getCourseMediaStatus(req: Request, res: Response): Promise<void> {
    const { courseId } = req.params;
    const orgId = req.user!.organizationId;

    const status = await mediaService.getCourseMediaStatus(orgId, courseId);

    res.status(200).json({
      status: 'success',
      data: status,
    });
  }
}

export const mediaController = new MediaController();
