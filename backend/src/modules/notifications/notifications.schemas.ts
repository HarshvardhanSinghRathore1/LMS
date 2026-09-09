import { z } from 'zod';

export const notificationQuerySchema = z.object({
  isRead: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ACTION_REQUIRED', 'ACHIEVEMENT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});
