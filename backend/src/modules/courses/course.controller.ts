import { Request, Response, NextFunction } from 'express';
import { courseService } from './course.service';
import {
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  createLessonSchema,
  updateLessonSchema,
  courseQuerySchema,
} from './course.schemas';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class CourseController {
  // 1. Create Course
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createCourseSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid course parameters', parsed.error.format(), req.requestId);
        return;
      }

      const course = await courseService.createCourse(req.user!.organizationId, req.user!.id, parsed.data);
      sendSuccess(res, course, { statusCode: 201, message: 'Course draft created successfully' });
    } catch (err) {
      next(err);
    }
  }

  // 2. List Courses (Catalog)
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = courseQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid query parameters', parsed.error.format(), req.requestId);
        return;
      }

      const result = await courseService.listCourses(req.user!.organizationId, parsed.data, req.user!.role);
      sendSuccess(res, result.courses, {
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Get Course Hierarchy Detail
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = req.params.courseId || req.params.id;
      const course = await courseService.getCourse(courseId, req.user!.organizationId, req.user!.role);
      sendSuccess(res, course);
    } catch (err) {
      next(err);
    }
  }

  // 4. Update Course
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = req.params.courseId || req.params.id;
      const parsed = updateCourseSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid update parameters', parsed.error.format(), req.requestId);
        return;
      }

      const updated = await courseService.updateCourse(courseId, req.user!.organizationId, parsed.data);
      sendSuccess(res, updated, { message: 'Course updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  // 5. Publish Course
  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = req.params.courseId || req.params.id;
      const published = await courseService.publishCourse(courseId, req.user!.organizationId);
      sendSuccess(res, published, { message: 'Course published successfully' });
    } catch (err) {
      next(err);
    }
  }

  // 6. Archive / Delete Course
  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = req.params.courseId || req.params.id;
      const archived = await courseService.archiveCourse(courseId, req.user!.organizationId);
      sendSuccess(res, archived, { message: 'Course archived successfully' });
    } catch (err) {
      next(err);
    }
  }

  // --- MODULE CONTROLLERS ---

  async createModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = req.params.courseId;
      const parsed = createModuleSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid module parameters', parsed.error.format(), req.requestId);
        return;
      }

      const module = await courseService.createModule(courseId, req.user!.organizationId, parsed.data);
      sendSuccess(res, module, { statusCode: 201, message: 'Course module added successfully' });
    } catch (err) {
      next(err);
    }
  }

  async updateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const moduleId = req.params.moduleId;
      const parsed = updateModuleSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid module parameters', parsed.error.format(), req.requestId);
        return;
      }

      const updated = await courseService.updateModule(moduleId, req.user!.organizationId, parsed.data);
      sendSuccess(res, updated, { message: 'Course module updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async deleteModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const moduleId = req.params.moduleId;
      await courseService.deleteModule(moduleId, req.user!.organizationId);
      sendSuccess(res, {}, { message: 'Course module deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // --- LESSON CONTROLLERS ---

  async createLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const moduleId = req.params.moduleId;
      const parsed = createLessonSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid lesson parameters', parsed.error.format(), req.requestId);
        return;
      }

      const lesson = await courseService.createLesson(moduleId, req.user!.organizationId, parsed.data);
      sendSuccess(res, lesson, { statusCode: 201, message: 'Course lesson added successfully' });
    } catch (err) {
      next(err);
    }
  }

  async updateLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lessonId = req.params.lessonId;
      const parsed = updateLessonSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid lesson parameters', parsed.error.format(), req.requestId);
        return;
      }

      const updated = await courseService.updateLesson(lessonId, req.user!.organizationId, parsed.data);
      sendSuccess(res, updated, { message: 'Course lesson updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async deleteLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lessonId = req.params.lessonId;
      await courseService.deleteLesson(lessonId, req.user!.organizationId);
      sendSuccess(res, {}, { message: 'Course lesson deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const courseController = new CourseController();
