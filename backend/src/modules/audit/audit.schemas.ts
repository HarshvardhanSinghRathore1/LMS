import { z } from 'zod';

const ACTIONS = [
  'USER_REGISTERED',
  'USER_ROLE_UPDATED',
  'USER_LOGIN',
  'USER_LOGOUT',
  'COURSE_CREATED',
  'COURSE_UPDATED',
  'COURSE_PUBLISHED',
  'COURSE_ARCHIVED',
  'ENROLLMENT_CREATED',
  'COURSE_COMPLETED',
  'ASSESSMENT_CREATED',
  'ASSESSMENT_PUBLISHED',
  'ASSESSMENT_SUBMITTED',
  'COMPETENCY_CREATED',
  'COMPETENCY_UPDATED',
  'COURSE_COMPETENCY_MAPPED',
  'RECOMMENDATION_CREATED',
  'RECOMMENDATION_ACCEPTED',
  'RECOMMENDATION_DISMISSED',
  'TRAINER_PROFILE_CREATED',
  'TRAINER_PROFILE_UPDATED',
  'TRAINER_EXPERTISE_UPDATED',
  'SESSION_REQUESTED',
  'SESSION_STATUS_CHANGED',
  'CERTIFICATE_ISSUED',
  'SNAPSHOT_INVALIDATED',
] as const;

const RESOURCE_TYPES = [
  'USER',
  'COURSE',
  'MODULE',
  'LESSON',
  'ENROLLMENT',
  'ASSESSMENT',
  'COMPETENCY',
  'RECOMMENDATION',
  'TRAINER_PROFILE',
  'TRAINER_SESSION',
  'CERTIFICATE',
  'ANALYTICS_SNAPSHOT',
] as const;

export const auditQuerySchema = z
  .object({
    actorId: z.string().uuid().optional(),
    action: z.enum(ACTIONS).optional(),
    resourceType: z.enum(RESOURCE_TYPES).optional(),
    resourceId: z.string().max(255).optional(),
    dateFrom: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    dateTo: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    {
      message: 'dateFrom cannot be later than dateTo',
      path: ['dateFrom'],
    }
  );

export const auditExportSchema = z
  .object({
    format: z.enum(['csv', 'json']).default('csv'),
    actorId: z.string().uuid().optional(),
    action: z.enum(ACTIONS).optional(),
    resourceType: z.enum(RESOURCE_TYPES).optional(),
    resourceId: z.string().max(255).optional(),
    dateFrom: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    dateTo: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  })
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    {
      message: 'dateFrom cannot be later than dateTo',
      path: ['dateFrom'],
    }
  );
