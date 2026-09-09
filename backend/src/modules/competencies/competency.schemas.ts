import { z } from 'zod';

export const createCompetencySchema = z.object({
  code: z
    .string()
    .min(2, 'Competency code must be at least 2 characters long')
    .max(50)
    .transform((val) => val.trim().toUpperCase()),
  name: z.string().min(2, 'Name must be at least 2 characters long').max(255),
  description: z.string().optional().default(''),
  category: z.string().optional().default('General'),
  targetScorePercentage: z
    .number()
    .min(0, 'Target score percentage must be >= 0')
    .max(100, 'Target score percentage must be <= 100')
    .default(75.0),
});

export const updateCompetencySchema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .transform((val) => val.trim().toUpperCase())
    .optional(),
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  targetScorePercentage: z.number().min(0).max(100).optional(),
});

export const mapCourseSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
  weight: z
    .number()
    .positive('Course mapping weight must be greater than 0')
    .default(1.0),
});

export const competencyQuerySchema = z.object({
  category: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
});

export type CreateCompetencyInput = z.infer<typeof createCompetencySchema>;
export type UpdateCompetencyInput = z.infer<typeof updateCompetencySchema>;
export type MapCourseInput = z.infer<typeof mapCourseSchema>;
export type CompetencyQueryInput = z.infer<typeof competencyQuerySchema>;
