import { z } from "zod";

export const paymentAdminReasonSchema = z.string().trim().min(5).max(1000);
export const paymentAdminChangeSchema = z.object({
  reason: paymentAdminReasonSchema,
  expectedUpdatedAt: z.string().datetime().optional(),
  confirmContentChange: z.boolean().default(false),
}).strict();
export const paymentAdminTargetSchema = z.string().uuid();
