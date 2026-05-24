// src/validations/question.ts
import { z } from "zod";

export const listQuestionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z
    .enum(["createdAt", "updatedAt", "points", "difficultyLevel", "questionType", "isActive"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),

  universityId: z.string().min(1).optional(),
  majorId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  chapterId: z.string().min(1).optional(),
});

export const QuestionTypeEnum = z.enum(["multiple_choice", "true_false", "short_answer", "essay"]);
export const DifficultyLevelEnum = z.enum(["easy", "medium", "hard"]);

const trimToNull = (v: unknown) => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t.length ? t : null;
};

const nullableText = (max: number) =>
  z.preprocess(trimToNull, z.union([z.string().max(max), z.null()]).optional());

const nullableUrl = z.preprocess(
  trimToNull,
  z.union([z.string().url("invalid_url").max(500), z.null()]).optional()
);

export const questionOptionInputSchema = z.object({
  optionText: z.string().trim().min(1, "option_text_required"),
  isCorrect: z.coerce.boolean().default(false),
  optionOrder: z.coerce.number().int().min(1).optional(),
});

function normalizeTF(s: string) {
  const t = s.trim().toLowerCase();
  // نقبل تخزين true/false (الموصى به) + نسمح عربي لتجنب كسر بيانات قديمة
  if (t === "true" || t === "صح") return "true";
  if (t === "false" || t === "خطأ" || t === "خطا") return "false";
  return t;
}

function addIssue(ctx: z.RefinementCtx, path: (string | number)[], message: string) {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

export const createQuestionSchema = z
  .object({
    chapterId: z.string().min(1, "chapter_required"),
    questionText: z.string().trim().min(1, "question_text_required"),
    questionType: QuestionTypeEnum.default("multiple_choice"),
    difficultyLevel: DifficultyLevelEnum.default("medium"),
    points: z.coerce.number().int().min(1).max(10).default(1),

    explanation: nullableText(2000),
    imageUrl: nullableUrl,

    tags: z.array(z.string().trim().min(1)).optional().default([]),
    isActive: z.coerce.boolean().default(true),

    options: z.array(questionOptionInputSchema).optional().default([]),
  })
  .superRefine((d, ctx) => {
    const opts = d.options ?? [];

    if (d.questionType === "multiple_choice") {
      if (opts.length < 2) addIssue(ctx, ["options"], "mc_requires_two_options");
      const correctCount = opts.filter((o) => o.isCorrect).length;
      if (correctCount < 1) addIssue(ctx, ["options"], "mc_requires_correct");
      return;
    }

    if (d.questionType === "true_false") {
      if (opts.length !== 2) addIssue(ctx, ["options"], "tf_requires_two_options");

      const normalized = opts.map((o) => normalizeTF(o.optionText));
      const set = new Set(normalized);

      // لازم يكون عندنا true و false
      if (!(set.has("true") && set.has("false"))) {
        addIssue(ctx, ["options"], "tf_options_must_be_true_false");
      }

      const correctCount = opts.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) addIssue(ctx, ["options"], "tf_requires_exactly_one_correct");

      return;
    }

    // short_answer / essay -> لا نريد options
    if (opts.length > 0) addIssue(ctx, ["options"], "options_not_allowed_for_type");
  });

export const updateQuestionSchema = z
  .object({
    chapterId: z.string().min(1).optional(),
    questionText: z.string().trim().min(1).optional(),
    questionType: QuestionTypeEnum.optional(),
    difficultyLevel: DifficultyLevelEnum.optional(),
    points: z.coerce.number().int().min(1).max(10).optional(),

    explanation: nullableText(2000),
    imageUrl: nullableUrl,

    tags: z.array(z.string().trim().min(1)).optional(),
    isActive: z.coerce.boolean().optional(),

    // إذا أرسلت options في التحديث لازم ترسل questionType معها
    options: z.array(questionOptionInputSchema).optional(),
  })
  .superRefine((d, ctx) => {
    if (typeof d.options === "undefined") return;

    // ✅ لتجنب التباس النوع: UI عندك دائمًا يرسل questionType
    if (typeof d.questionType === "undefined") {
      addIssue(ctx, ["questionType"], "questionType_required_when_options_provided");
      return;
    }

    const opts = d.options ?? [];

    if (d.questionType === "multiple_choice") {
      if (opts.length < 2) addIssue(ctx, ["options"], "mc_requires_two_options");
      const correctCount = opts.filter((o) => o.isCorrect).length;
      if (correctCount < 1) addIssue(ctx, ["options"], "mc_requires_correct");
      return;
    }

    if (d.questionType === "true_false") {
      if (opts.length !== 2) addIssue(ctx, ["options"], "tf_requires_two_options");

      const normalized = opts.map((o) => normalizeTF(o.optionText));
      const set = new Set(normalized);

      if (!(set.has("true") && set.has("false"))) {
        addIssue(ctx, ["options"], "tf_options_must_be_true_false");
      }

      const correctCount = opts.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) addIssue(ctx, ["options"], "tf_requires_exactly_one_correct");

      return;
    }

    if (opts.length > 0) addIssue(ctx, ["options"], "options_not_allowed_for_type");
  });

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
