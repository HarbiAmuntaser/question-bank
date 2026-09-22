import { z } from "zod";

const version = z.number().int().min(0).max(2147483646);
const key = z.string().uuid();
const note = z.string().trim().min(1).max(2000);
const message = z.string().trim().max(1000).optional();
export const reviewSubmissionSchema = z.object({ expectedVersion: version, idempotencyKey: key }).strict();
const base = { expectedVersion: version, idempotencyKey: key, internalNote: note, studentMessage: message };
const amount = z.string().regex(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/);
const positive = amount.refine((value) => Number(value) > 0);
const reference = z.string().trim().min(3).max(160).regex(/^[a-zA-Z0-9][a-zA-Z0-9:._/-]*$/).transform((s) => s.toLowerCase());
export const adminReviewSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("receipt"), amount: positive, reference }).strict(),
  z.object({ ...base, action: z.literal("refund"), amount: positive, reference }).strict(),
  z.object({ ...base, action: z.literal("correction"), entryId: z.string().uuid(), amount }).strict(),
  z.object({ ...base, action: z.literal("submitted") }).strict(),
  z.object({ ...base, action: z.literal("additional_requested"), studentMessage: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ ...base, action: z.literal("rejected"), studentMessage: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ ...base, action: z.literal("approved") }).strict(),
  z.object({ ...base, action: z.literal("note") }).strict(),
]);
export const adminOrderListSchema = z.object({
  q: z.string().trim().max(160).default(""),
  status: z.enum(["all", "pending_payment", "pending_review", "awaiting_additional_payment", "approved", "rejected", "cancelled", "expired"]).default("all"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict();
export const reviewHistorySchema = z.object({ before: z.coerce.number().int().positive().optional() }).strict();
