import { z } from 'zod';

export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query cannot exceed 1000 characters'),
  courseId: z.string().uuid('Invalid course ID').optional(),
  topK: z.number().int().min(1).max(20).default(5).optional(),
  similarityThreshold: z.number().min(0).max(1).default(0.25).optional(),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message cannot exceed 2000 characters'),
  courseId: z.string().uuid('Invalid course ID').optional(),
  conversationId: z.string().uuid('Invalid conversation ID').optional(),
  topK: z.number().int().min(1).max(10).default(5).optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export const createContextFactSchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  entityType: z.enum([
    'STRUGGLE_CONCEPT',
    'LEARNING_PREFERENCE',
    'TARGET_COMPETENCY',
    'PRIOR_KNOWLEDGE',
  ]),
  factText: z.string().min(3, 'Fact text must be at least 3 characters').max(1000, 'Fact text cannot exceed 1000 characters'),
  confidenceScore: z.number().min(0.0).max(1.0).default(1.0),
  sourceEvent: z.string().max(100).optional(),
});

export type CreateContextFactInput = z.infer<typeof createContextFactSchema>;

export const indexCourseSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
});

export type IndexCourseInput = z.infer<typeof indexCourseSchema>;
