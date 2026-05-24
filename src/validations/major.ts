// src/validations/major.ts
import { z } from "zod";

// مساعد يطبّع السلسلة: "" => undefined
const emptyToUndefined = z
  .string()
  .transform((v) => (v?.trim() === "" ? undefined : v?.trim()));
  
export const listMajorsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(5000).default(10),
  sortBy: z.enum(["name", "createdAt", "code"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  query: z.string().default(""),
  // اجعلها اختيارية وأي نص غير فارغ مقبول
  universityId: z.string().trim().min(1).optional(),
});

export const createMajorSchema = z.object({
  universityId: z.string().min(1, "universityId required"),
  name: z.string().min(2, "name too short").transform((s) => s.trim()),
  code: emptyToUndefined.optional().nullable().transform((v) => v ?? null),
  degreeType: emptyToUndefined.optional().nullable().transform((v) => v ?? null),
  durationYears: z
    .union([z.coerce.number().int().min(1).max(10), z.null(), z.undefined()])
    .transform((v) => (v === undefined ? null : v)),
  isActive: z.coerce.boolean().default(true),
});

export const updateMajorSchema = createMajorSchema.partial();
