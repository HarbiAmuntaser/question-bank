import { z } from "zod";

const unicodeSlugRegex = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

const emptyToUndefined = (value: unknown) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  return value;
};

const emptyToNullString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || typeof value === "undefined") return null;
      return value;
    },
    z.string().trim().min(1).max(max).nullable(),
  );

const idString = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(191, "المعرف طويل جدًا");

const nullableId = z.preprocess(
  (value) => {
    if (value === "" || value === null || typeof value === "undefined") return null;
    return value;
  },
  idString("المعرف غير صالح").nullable(),
);

const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());

const optionalPositiveInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().positive("يجب أن يكون الرقم أكبر من صفر").optional(),
);

const intWithDefault = (fallback: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().default(fallback));

const coerceBoolean = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["true", "on", "1"].includes(normalized)) return true;
    if (["false", "off", "0"].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

export const studySummaryStatusSchema = z.enum(["draft", "published", "archived"]);
export const studySummaryStatusFilterSchema = z.enum(["all", "draft", "published", "archived"]);
export const studySummaryLanguageSchema = z.enum(["ar", "en"]);
export const studySummaryAccessTypeSchema = z.enum(["inherit", "free", "paid"]);

export const studySummarySlugSchema = z
  .string()
  .trim()
  .min(1, "Slug مطلوب")
  .max(190, "Slug طويل جدًا")
  .refine((value) => unicodeSlugRegex.test(value), {
    message: "Slug يسمح بحروف وأرقام وشرطة (-) فقط بدون مسافات",
  })
  .transform((value) => value.toLowerCase());

const jsonContentField = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  return value;
}, z.unknown().optional());

const summaryShape = z.object({
  subjectId: idString("المادة مطلوبة"),
  chapterId: nullableId.optional(),
  title: z.string().trim().min(2, "عنوان الملخص مطلوب").max(180, "العنوان طويل جدًا"),
  slug: studySummarySlugSchema,
  excerpt: emptyToNullString(700),
  contentHtml: emptyToNullString(200000),
  contentText: emptyToNullString(50000),
  content: jsonContentField,
  pdfAttachmentId: nullableId.optional(),
  status: studySummaryStatusSchema.default("draft"),
  accessType: studySummaryAccessTypeSchema.default("inherit"),
  publishedAt: optionalDate,
  language: studySummaryLanguageSchema.default("ar"),
  readingMinutes: optionalPositiveInt,
  sortOrder: intWithDefault(0),
  isFeatured: coerceBoolean.default(false),
});

function hasSummaryContent(data: {
  contentHtml?: string | null;
  contentText?: string | null;
  pdfAttachmentId?: string | null;
}) {
  return Boolean(data.contentHtml?.trim() || data.contentText?.trim() || data.pdfAttachmentId);
}

export const createStudySummarySchema = summaryShape.superRefine((data, ctx) => {
  if (!hasSummaryContent(data)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contentHtml"],
      message: "يجب إدخال محتوى HTML أو نص الملخص أو ملف PDF",
    });
  }
});

export const updateStudySummarySchema = summaryShape
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "لا توجد حقول للتحديث" });

export const listStudySummariesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  query: z.preprocess((value) => (typeof value === "string" ? value.trim() : ""), z.string().default("")),
  status: studySummaryStatusFilterSchema.default("all"),
  subjectId: z.preprocess(emptyToUndefined, idString("المادة غير صحيحة").optional()),
  chapterId: z.preprocess(emptyToUndefined, idString("الفصل غير صحيح").optional()),
  sortBy: z.enum(["createdAt", "updatedAt", "publishedAt", "title", "sortOrder"]).catch("updatedAt").default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).catch("desc").default("desc"),
});

export type CreateStudySummaryInput = z.infer<typeof createStudySummarySchema>;
export type UpdateStudySummaryInput = z.infer<typeof updateStudySummarySchema>;
export type ListStudySummariesQuery = z.infer<typeof listStudySummariesQuerySchema>;
