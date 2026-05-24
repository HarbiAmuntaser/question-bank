// src/validations/subject.ts
import { z } from "zod";

/* ------------------------- Helpers ------------------------- */

// يحول "" أو null/undefined إلى undefined (مفيد للـ query params)
const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null || typeof v === "undefined" ? undefined : v), schema);

// يحول "" إلى null للحقول النصية الاختيارية
const emptyToNullString = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().trim().min(1).max(1000).nullable()
);

// رقم صحيح اختياري يقبل string ويحوّل "" إلى null
const optionalInt = (min: number, max?: number) =>
  z.preprocess(
    (v) => {
      if (v === "" || v === null || typeof v === "undefined") return null;
      if (typeof v === "string" && v.trim() === "") return null;
      const n = typeof v === "string" ? Number(v) : (v as number);
      return Number.isFinite(n) ? n : NaN;
    },
    max != null
      ? z.number().int().min(min).max(max).nullable()
      : z.number().int().min(min).nullable()
  );

// يقبل boolean أو "true"/"false" أو "on"/"off"
const coerceBoolean = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "true" || s === "on" || s === "1") return true;
    if (s === "false" || s === "off" || s === "0") return false;
  }
  return v;
}, z.boolean());

/* --------------------- List Query Schema --------------------- */

export const listSubjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(5000).default(10),
  sortBy: z
    .enum(["name", "createdAt", "code"])
    .catch("createdAt") // أي قيمة غير صالحة تُحوّل لافتراضي
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).catch("desc").default("desc"),
  query: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string().default("")),
  universityId: emptyToUndefined(z.string().min(1)).optional(),
  majorId: emptyToUndefined(z.string().min(1)).optional(),
});

export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;

/* -------------------- Create Subject Schema -------------------- */

export const createSubjectSchema = z.object({
  majorId: z.string().min(1, "حقل التخصص مطلوب"),
  name: z.string().trim().min(2, "الاسم قصير جداً").max(200),
  code: emptyToNullString, // nullable
  creditHours: optionalInt(1, 6), // nullable
  semester: optionalInt(1, 3), // nullable
  year: optionalInt(1, 6), // nullable
  description: z.preprocess((v) => (v === "" ? null : v), z.string().max(2000).nullable()),
  isActive: coerceBoolean.default(true),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

/* -------------------- Update Subject Schema -------------------- */
// جميع الحقول اختيارية، مع السماح بـ null للحقل القابل لذلك.
export const updateSubjectSchema = z
  .object({
    majorId: emptyToUndefined(z.string().min(1)).optional(),
    name: z.string().trim().min(2).max(200).optional(),
    code: z.preprocess((v) => (v === "" ? null : v), z.string().trim().min(1).max(1000).nullable()).optional(),
    creditHours: optionalInt(1, 6).optional(),
    semester: optionalInt(1, 3).optional(),
    year: optionalInt(1, 6).optional(),
    description: z
      .preprocess((v) => (v === "" ? null : v), z.string().max(2000).nullable())
      .optional(),
    isActive: coerceBoolean.optional(),
  })
  // اختيارياً: تحقق أن هناك حقل/أكثر للتعديل
  .refine((data) => Object.keys(data).length > 0, {
    message: "لا يوجد أي حقل للتحديث",
  });

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
