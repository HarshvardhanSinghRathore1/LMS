import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().max(100).default('General'),
  difficultyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  metadata: z.record(z.any()).optional().default({}),
});

export const updateCourseSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(10).optional(),
  category: z.string().max(100).optional(),
  difficultyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  metadata: z.record(z.any()).optional(),
});

export const createModuleSchema = z.object({
  title: z.string().min(2, 'Module title must be at least 2 characters').max(255),
  description: z.string().optional().default(''),
  orderIndex: z.number().int().min(0, 'Order index must be non-negative'),
});

export const updateModuleSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const createLessonSchema = z.object({
  title: z.string().min(2, 'Lesson title must be at least 2 characters').max(255),
  contentType: z.string().default('TEXT'),
  contentBody: z.string().optional().default(''),
  videoUrl: z.string().url('Invalid video URL format').nullable().optional(),
  durationMinutes: z.number().int().min(0, 'Duration cannot be negative').default(0),
  orderIndex: z.number().int().min(0, 'Order index must be non-negative'),
});

export const updateLessonSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  contentType: z.string().optional(),
  contentBody: z.string().optional(),
  videoUrl: z.string().url('Invalid video URL format').nullable().optional(),
  durationMinutes: z.number().int().min(0).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const courseQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  category: z.string().optional(),
  difficultyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  search: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type CourseQueryInput = z.infer<typeof courseQuerySchema>;
