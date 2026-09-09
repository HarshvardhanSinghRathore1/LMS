import { z } from 'zod';

export const recommendationIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid recommendation ID format. Must be a valid UUID.' }),
});

export const pathwayQuerySchema = z.object({
  courseId: z
    .string()
    .uuid({ message: 'Invalid course ID format. Must be a valid UUID.' })
    .optional(),
});
