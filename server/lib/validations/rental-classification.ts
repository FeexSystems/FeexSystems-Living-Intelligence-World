import { z } from 'zod';

/** Output contract for maintenance request classification (AI or deterministic). */
export const maintenanceClassificationSchema = z.object({
  category: z.string().trim().min(1, 'category is required'),
  recommendedPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().max(600),
  recommendedAction: z.string().trim().max(4000),
});

export type MaintenanceClassification = z.infer<typeof maintenanceClassificationSchema>;