import { z } from 'zod';

export const createAssessmentSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
  title: z.string().min(2, 'Title must be at least 2 characters long').max(255),
  description: z.string().optional().default(''),
  passingScorePercentage: z
    .number()
    .min(0, 'Passing score must be >= 0')
    .max(100, 'Passing score must be <= 100')
    .default(70),
  timeLimitMinutes: z.number().int().positive('Time limit must be greater than 0').nullable().optional(),
  maxAttempts: z.number().int().min(1, 'Max attempts must be at least 1').max(50).default(3),
});

export const updateAssessmentSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  passingScorePercentage: z.number().min(0).max(100).optional(),
  timeLimitMinutes: z.number().int().positive().nullable().optional(),
  maxAttempts: z.number().int().min(1).max(50).optional(),
});

export const createQuestionSchema = z.object({
  questionText: z.string().min(2, 'Question text is required'),
  questionType: z.enum(['MCQ', 'TRUE_FALSE']),
  points: z.number().int().positive('Points must be greater than 0').default(10),
  orderIndex: z.number().int().min(0, 'Order index must be non-negative'),
  options: z.array(z.any()).min(2, 'At least 2 options are required for MCQ / TRUE_FALSE'),
  correctAnswer: z.any({ required_error: 'Correct answer is required' }),
});

export const updateQuestionSchema = z.object({
  questionText: z.string().min(2).optional(),
  questionType: z.enum(['MCQ', 'TRUE_FALSE']).optional(),
  points: z.number().int().positive().optional(),
  orderIndex: z.number().int().min(0).optional(),
  options: z.array(z.any()).min(2).optional(),
  correctAnswer: z.any().optional(),
});

export const submitAnswersSchema = z.object({
  answers: z.record(z.string(), z.any(), { required_error: 'Answers map is required' }),
});

export const assessmentQuerySchema = z.object({
  courseId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
export type AssessmentQueryInput = z.infer<typeof assessmentQuerySchema>;
