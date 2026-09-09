import { z } from 'zod';

export const createTrainerProfileSchema = z.object({
  headline: z.string().max(255).optional().nullable(),
  bio: z.string().optional().nullable(),
  yearsOfExperience: z.number().int().min(0).default(0),
  hourlyCapacity: z.number().int().min(0).default(10),
  isAvailable: z.boolean().default(true),
});

export const updateTrainerProfileSchema = z.object({
  headline: z.string().max(255).optional().nullable(),
  bio: z.string().optional().nullable(),
  yearsOfExperience: z.number().int().min(0).optional(),
  hourlyCapacity: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
});

export const addExpertiseSchema = z.object({
  competencyId: z.string().uuid(),
  proficiencyLevel: z.enum(['ADVANCED', 'EXPERT']),
  yearsExperience: z.number().int().min(0).default(1),
});

export const createSessionRequestSchema = z.object({
  trainerId: z.string().uuid(),
  competencyId: z.string().uuid().optional().nullable(),
  topic: z.string().min(1).max(255),
  notes: z.string().optional().nullable(),
  requestedSlot: z.string().datetime().optional().nullable(),
});

export const getMatchesQuerySchema = z.object({
  competencyId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});
