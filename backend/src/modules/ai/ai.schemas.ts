import { z } from 'zod';

export const generateNotesSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
  moduleId: z.string().uuid('Invalid module ID format').optional(),
  topic: z.string().max(255).optional(),
  customPrompt: z.string().max(1000).optional(),
});

export const generateMcqsSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
  moduleId: z.string().uuid('Invalid module ID format').optional(),
  lessonId: z.string().uuid('Invalid lesson ID format').optional(),
  topic: z.string().max(255).optional(),
  count: z.number().int().min(1, 'At least 1 question must be requested').max(20, 'Maximum 20 questions allowed per generation').default(5),
  difficulty: z.enum(['BALANCED', 'EASY', 'MEDIUM', 'HARD']).default('BALANCED'),
});

export const mcqContentSchema = z.object({
  questionText: z.string().min(2, 'Question text must not be empty'),
  questionType: z.literal('MCQ').default('MCQ'),
  options: z.array(z.string().min(1)).min(2, 'At least 2 options are required'),
  correctAnswer: z.string().min(1, 'Correct answer string is required'),
  points: z.number().int().positive('Points must be greater than 0').default(10),
  explanation: z.string().optional().default(''),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  questionCategory: z.string().optional(),
  sourceReference: z.string().optional(),
}).refine((data) => data.options.includes(data.correctAnswer), {
  message: 'MCQ correct answer must correspond to one of the provided options',
  path: ['correctAnswer'],
});

export const updateGeneratedItemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.any(),
  reviewNotes: z.string().max(1000).optional(),
});

export const regenerateMcqSchema = z.object({
  feedback: z.string().max(500).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
});

export const reviewItemSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  targetAssessmentId: z.string().uuid('Invalid target assessment ID format').optional(),
  editedContent: z.any().optional(),
  reviewNotes: z.string().max(1000).optional(),
});

export const tutorChatSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format').optional(),
  lessonId: z.string().uuid('Invalid lesson ID format').optional(),
  conversationId: z.string().uuid('Invalid conversation ID format').optional(),
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
});

export const aiQuerySchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  itemType: z.enum(['STUDY_NOTES', 'MCQ']).optional(),
  courseId: z.string().uuid().optional(),
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
});

export type GenerateNotesInput = z.infer<typeof generateNotesSchema>;
export type GenerateMcqsInput = z.infer<typeof generateMcqsSchema>;
export type UpdateGeneratedItemInput = z.infer<typeof updateGeneratedItemSchema>;
export type RegenerateMcqInput = z.infer<typeof regenerateMcqSchema>;
export type ReviewItemInput = z.infer<typeof reviewItemSchema>;
export type TutorChatInput = z.infer<typeof tutorChatSchema>;
export type AIQueryInput = z.infer<typeof aiQuerySchema>;
