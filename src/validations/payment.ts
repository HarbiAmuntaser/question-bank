import { z } from "zod";
const id = z.string().trim().min(1).max(100);
export const redeemPaymentCodeSchema = z.object({
  code: z.string().trim().min(1).max(80), subjectId: id, quizId: id.optional(),
}).strict();

const days = z.number().int().min(1).max(36500).nullable();
export const paymentPlanSchema = z.object({
  scopeType: z.literal("subject"), subjectId: id, title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable(), price: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/).nullable(),
  currency: z.literal("SAR"), isActive: z.boolean(),
  whatsappNumber: z.string().regex(/^\+?\d{6,20}$/).nullable(),
  telegramUsername: z.string().regex(/^@?[a-zA-Z0-9_]{5,32}$/).nullable(),
  contactMessage: z.string().max(2000).nullable(), defaultDurationDays: days,
  defaultMaxUses: z.number().int().min(1).max(10000),
}).strict();
export const issuePaymentCodeSchema = z.object({
  planId: id, idempotencyKey: z.string().uuid(), maxUses: z.number().int().min(1).max(10000).nullable(), durationDays: days,
  startsAt: z.date().nullable(), expiresAt: z.date().nullable(), note: z.string().max(2000).nullable(),
}).strict().refine((v) => !v.startsAt || !v.expiresAt || v.startsAt < v.expiresAt, { message: "invalid_code_window" });
