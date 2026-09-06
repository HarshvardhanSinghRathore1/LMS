import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
});

export const listEnrollmentsQuerySchema = z.object({
  status: z.enum(['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED']).optional(),
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
});

export const lessonCompletionSchema = z.object({
  completed: z.boolean().optional().default(true),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>;
export type LessonCompletionInput = z.infer<typeof lessonCompletionSchema>;
