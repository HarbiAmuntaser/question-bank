// src/validations/chapter.ts
import { z } from "zod";

export const listChaptersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(10),
  sortBy: z.enum(["name", "createdAt", "chapterNumber"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  query: z.string().trim().default(""),
  universityId: z.string().min(1).optional(),
  majorId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
});

export const createChapterSchema = z.object({
  subjectId: z.string().min(1, "subjectId_required"),
  name: z.string().min(1, "name_required"),
  chapterNumber: z.number().int().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  learningObjectives: z.array(z.string().min(1)).default([]),
  isActive: z.boolean().default(true),
});

export const updateChapterSchema = createChapterSchema.partial();
