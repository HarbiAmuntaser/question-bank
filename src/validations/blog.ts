import { z } from "zod";

const unicodeSlugRegex = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

const emptyToNullString = (max = 1000) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || typeof value === "undefined") return null;
      return value;
    },
    z.string().trim().min(1).max(max).nullable(),
  );

const emptyToUndefined = (value: unknown) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  return value;
};

const coerceBoolean = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["true", "on", "1"].includes(normalized)) return true;
    if (["false", "off", "0"].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());

const optionalPositiveInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive().optional(),
);

const intWithDefault = (fallback: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().default(fallback));

const stringArray = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string().trim().min(1)));

export const blogStatusFilterSchema = z.enum(["all", "active", "inactive"]);
export const blogPostStatusSchema = z.enum(["draft", "published", "archived"]);
export const blogVisibilitySchema = z.enum(["global", "countries"]);
export const blogPostStatusFilterSchema = z.enum(["all", "draft", "published", "archived"]);
export const blogCountryCodeSchema = z.enum(["SA", "YE"]);

export const blogSlugSchema = z
  .string()
  .trim()
  .min(1, "Slug مطلوب")
  .max(190, "Slug طويل جدًا")
  .refine((value) => unicodeSlugRegex.test(value), {
    message: "Slug يسمح بحروف وأرقام وشرطة (-) فقط بدون مسافات",
  })
  .transform((value) => value.toLowerCase());

const blogTaxonomyBaseSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(120, "الاسم طويل جدًا"),
  slug: blogSlugSchema,
  description: emptyToNullString(500),
  isActive: coerceBoolean.default(true),
});

export const listBlogTaxonomyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  query: z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().default("")),
  status: blogStatusFilterSchema.default("all"),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "slug"]).catch("createdAt").default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).catch("desc").default("desc"),
});

export const createBlogTopicSchema = blogTaxonomyBaseSchema;
export const updateBlogTopicSchema = blogTaxonomyBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "لا توجد حقول للتحديث" });

export const createBlogTagSchema = blogTaxonomyBaseSchema;
export const updateBlogTagSchema = blogTaxonomyBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "لا توجد حقول للتحديث" });

const blogPostShape = z.object({
  title: z.string().trim().min(2, "عنوان المقال مطلوب").max(180, "العنوان طويل جدًا"),
  slug: blogSlugSchema,
  excerpt: emptyToNullString(500),
  primaryTopicId: z.string().uuid("الموضوع الرئيسي غير صحيح"),
  tagIds: stringArray.default([]),
  status: blogPostStatusSchema.default("draft"),
  publishedAt: optionalDate,
  visibility: blogVisibilitySchema.default("global"),
  countries: z.array(blogCountryCodeSchema).default([]),
  contentHtml: emptyToNullString(200000),
  contentText: emptyToNullString(20000),
  readingMinutes: optionalPositiveInt,
  featured: coerceBoolean.default(false),
  sortOrder: intWithDefault(0),
  coverAttachmentId: z.preprocess(
    (value) => {
      if (value === "" || value === null || typeof value === "undefined") return null;
      return value;
    },
    z.string().uuid().nullable().optional(),
  ),
});

export const createBlogPostSchema = blogPostShape.superRefine((data, ctx) => {
    if (data.visibility === "countries" && data.countries.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["countries"],
        message: "يجب اختيار دولة واحدة على الأقل",
      });
    }

    if (!data.contentHtml && !data.contentText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentHtml"],
        message: "يجب إدخال محتوى HTML أو نص المقال",
      });
    }
  });

export const listBlogPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  query: z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().default("")),
  status: blogPostStatusFilterSchema.default("all"),
  sortBy: z.enum(["createdAt", "updatedAt", "publishedAt", "title", "sortOrder"]).catch("updatedAt").default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).catch("desc").default("desc"),
});

export const updateBlogPostSchema = blogPostShape
  .partial()
  .superRefine((data, ctx) => {
    if (data.visibility === "countries" && (!data.countries || data.countries.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["countries"],
        message: "يجب اختيار دولة واحدة على الأقل",
      });
    }

    const hasContentHtml = typeof data.contentHtml === "string" && data.contentHtml.trim().length > 0;
    const hasContentText = typeof data.contentText === "string" && data.contentText.trim().length > 0;
    if (("contentHtml" in data || "contentText" in data) && !hasContentHtml && !hasContentText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentHtml"],
        message: "يجب إدخال محتوى HTML أو نص المقال",
      });
    }
  });

export type ListBlogTaxonomyQuery = z.infer<typeof listBlogTaxonomyQuerySchema>;
export type CreateBlogTopicInput = z.infer<typeof createBlogTopicSchema>;
export type UpdateBlogTopicInput = z.infer<typeof updateBlogTopicSchema>;
export type CreateBlogTagInput = z.infer<typeof createBlogTagSchema>;
export type UpdateBlogTagInput = z.infer<typeof updateBlogTagSchema>;
export type ListBlogPostsQuery = z.infer<typeof listBlogPostsQuerySchema>;
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
