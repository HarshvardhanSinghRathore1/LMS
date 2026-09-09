import { z } from 'zod';

export const LeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1, 'limit must be at least 1').max(50, 'limit cannot exceed 50').default(10),
});

export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
