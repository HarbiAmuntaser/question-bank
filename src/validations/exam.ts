// src/validations/exam.ts
import { z } from "zod";

export const listExamPapersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(["createdAt", "year", "term", "session"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),

  // فلاتر اختيارية
  universityId: z.string().min(1).optional(),
  majorId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  year: z.coerce.number().int().min(1900).max(3000).optional(),
  term: z.enum(["first", "second", "summer"]).optional(),
  session: z.enum(["regular", "makeup", "special"]).optional(),
  isPublished: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const createExamPaperSchema = z.object({
  subjectId: z.string().min(1, "subject_required"),
  year: z.coerce.number().int().min(1900).max(3000),
  term: z.enum(["first", "second", "summer"]),
  session: z.enum(["regular", "makeup", "special"]).default("regular"),
  code: z.string().trim().optional().nullable(),
  source: z.string().trim().optional().nullable(),
  fileUrl: z.string().url().optional().nullable(),
  pagesCount: z.coerce.number().int().min(1).optional().nullable(),
  isPublished: z.boolean().default(true),
  language: z.enum(["ar", "en"]).default("ar"),
});

export const updateExamPaperSchema = createExamPaperSchema.partial().extend({
  // لا نسمح بتغيير subjectId غالبًا، لكن لو أردتها ممكن تزيل .partial() عن subjectId
  subjectId: z.string().min(1).optional(),
});
