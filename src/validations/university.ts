import { z } from "zod";


export const sortByEnum = z.enum(["name", "createdAt"]);
export const sortOrderEnum = z.enum(["asc", "desc"]);
export const institutionVisibilityEnum = z.enum(["country", "global"]);


export const listQuerySchema = z.object({
page: z.coerce.number().int().min(1).default(1),
pageSize: z.coerce.number().int().min(1).max(100).default(10),
sortBy: sortByEnum.default("createdAt"),
sortOrder: sortOrderEnum.default("desc"),
query: z.string().trim().max(200).optional().default(""),
});


export const createUniversitySchema = z.object({
name: z.string().min(2).max(200),
code: z.string().min(1).max(50).optional().nullable(),
city: z.string().min(1).max(120).optional().nullable(),
region: z.string().min(1).max(120).optional().nullable(),
logoUrl: z.string().url().max(500).optional().nullable(),
isActive: z.boolean().optional().default(true),
  countryCode: z.string().length(2).toUpperCase(),
  institutionType: z.enum(["university","school","academy"]),
  visibility: institutionVisibilityEnum.optional().default("country"),
});


export const updateUniversitySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),

  // اختياريتان في التحديث
  countryCode: z.string().length(2).toUpperCase().optional(),
  institutionType: z.enum(["university","school","academy"]).optional(),
  visibility: institutionVisibilityEnum.optional(),
});


export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateUniversityInput = z.infer<typeof createUniversitySchema>;
export type UpdateUniversityInput = z.infer<typeof updateUniversitySchema>;
