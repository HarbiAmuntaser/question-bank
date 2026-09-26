import { z } from "zod";

import { validateCollegeSlug } from "@/lib/college-slugs";

const emptyToNull = z.preprocess(
  (value) => (value === "" || typeof value === "undefined" ? null : value),
  z.string().trim().min(1).max(50).nullable(),
);

export const listCollegesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(["name", "slug", "createdAt", "code"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  query: z.string().trim().max(200).default(""),
  universityId: z.string().trim().min(1).optional(),
});

export const createCollegeSchema = z.object({
  universityId: z.string().trim().min(1, "universityId required"),
  name: z.string().trim().min(2).max(200),
  slug: z.unknown().transform((value, ctx) => {
    const result = validateCollegeSlug(value);
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error });
      return z.NEVER;
    }
    return result.slug;
  }),
  code: emptyToNull.optional().transform((value) => value ?? null),
  isActive: z.coerce.boolean().default(true),
});

export const updateCollegeSchema = createCollegeSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "at_least_one_field_required" },
);
