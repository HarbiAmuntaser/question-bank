// src/validations/seo-meta.ts
import { z } from "zod";

export const seoOwnerTypes = [
  "university",
  "major",
  "subject",
  "chapter",
  "exam", // ✅ يبقى exam لكنه مربوط بـ Quiz
  "blog_post",
  "blog_topic",
  "blog_tag",
  "study_summary",
] as const;

export const seoLocales = ["ar", "en"] as const;

const asciiSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const unicodeSlugRegex = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

const textField = (max: number) =>
  z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const trimmed = val.trim();
        return trimmed === "" ? null : trimmed;
      }
      if (val === null || typeof val === "undefined") return null;
      return val;
    },
    z.union([z.string().max(max, `النص طويل (الحد ${max})`), z.null()]).optional(),
  );

const urlField = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed === "" ? null : trimmed;
    }
    if (val === null || typeof val === "undefined") return null;
    return val;
  },
  z.union([z.string().url("الرابط غير صالح").max(500, "الرابط طويل جداً"), z.null()]).optional(),
);

const schemaJsonField = z.any().optional();

export const listSeoMetaQuerySchema = z.object({
  ownerType: z.enum(seoOwnerTypes).optional(),
  ownerId: z.string().min(1, "يرجى اختيار المالك").optional(),
  locale: z.enum(seoLocales).optional(),
  query: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().optional()).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["updatedAt", "createdAt", "slug"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ✅ قاعدة عامة (unicode) — يسمح عربي/إنجليزي/أرقام + (-)
const slugField = z
  .string()
  .trim()
  .min(1, "حقل Slug مطلوب")
  .max(190, "Slug طويل جداً")
  .refine((v) => unicodeSlugRegex.test(v), {
    message: "Slug يسمح بحروف/أرقام وشرطة (-) فقط بدون مسافات",
  });

export const createSeoMetaSchema = z
  .object({
    ownerType: z.enum(seoOwnerTypes, { message: "نوع المالك غير صالح" }),
    ownerId: z.string().min(1, "يرجى اختيار المالك"),
    locale: z.enum(seoLocales).default("ar"),
    slug: slugField,
    metaTitle: textField(160),
    metaDescription: textField(320),
    ogTitle: textField(160),
    ogDescription: textField(320),
    ogImageUrl: urlField,
    canonicalUrl: urlField,
    noindex: z.coerce.boolean().optional().default(false),
    nofollow: z.coerce.boolean().optional().default(false),
    schemaJson: schemaJsonField,
  })
  .superRefine((data, ctx) => {
    // ✅ en => ASCII only
    if (data.locale === "en" && data.ownerType !== "chapter") {
      const s = data.slug.trim().toLowerCase();
      if (!asciiSlugRegex.test(s)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slug"],
          message: "Slug للإنجليزية يجب أن يكون a-z/0-9 واستخدام (-) فقط",
        });
      }
    }
  });

export const updateSeoMetaSchema = z
  .object({
    locale: z.enum(seoLocales).optional(),
    slug: slugField.optional(),
    metaTitle: textField(160),
    metaDescription: textField(320),
    ogTitle: textField(160),
    ogDescription: textField(320),
    ogImageUrl: urlField,
    canonicalUrl: urlField,
    noindex: z.coerce.boolean().optional(),
    nofollow: z.coerce.boolean().optional(),
    schemaJson: schemaJsonField,
  })
  .superRefine((data, ctx) => {
    // ✅ لو المستخدم مرسل locale=en + slug => enforce ASCII هنا
    if (data.locale === "en" && typeof data.slug === "string") {
      const s = data.slug.trim().toLowerCase();
      if (!asciiSlugRegex.test(s)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slug"],
          message: "Slug للإنجليزية يجب أن يكون a-z/0-9 واستخدام (-) فقط",
        });
      }
    }
  })
  .refine((data) => Object.keys(data).length > 0, { message: "لا توجد حقول للتحديث" });

export type CreateSeoMetaInput = z.infer<typeof createSeoMetaSchema>;
export type UpdateSeoMetaInput = z.infer<typeof updateSeoMetaSchema>;
