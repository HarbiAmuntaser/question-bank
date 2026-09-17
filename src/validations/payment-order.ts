import { z } from "zod";
const planId = z.string().trim().min(1).max(100);
const planIds = z.array(planId).min(1).max(10).refine((ids) => new Set(ids).size === ids.length, "duplicate_plan");
export const orderQuoteSchema = z.object({ planIds }).strict();
export const createOrderSchema = z.object({
  planIds, contactMethod: z.enum(["whatsapp", "telegram"]),
  quoteVersion: z.string().regex(/^[a-f0-9]{64}$/), idempotencyKey: z.string().uuid(),
}).strict();
export const orderCatalogSchema = z.object({ q: z.string().trim().max(100).default("") }).strict();
export const orderListSchema = z.object({ cursor: z.string().max(300).optional() }).strict();
export const orderCursorSchema = z.object({ createdAt: z.string().datetime(), id: z.string().uuid() }).strict();
export const orderIdSchema = z.string().uuid();
export const emptyOrderActionSchema = z.object({}).strict();
