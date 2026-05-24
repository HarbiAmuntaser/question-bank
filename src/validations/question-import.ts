import { z } from "zod";

// الحقول المشتركة (بدون difficultyLevel, imageUrl, tags)
const baseQuestion = z.object({
  questionText: z.string().min(1, "نص السؤال مطلوب"),
  points: z.number().int().min(1).optional().default(1),
  explanation: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  // الحقول التالية غير مستخدمة حاليًا، إن وُجدت سنسمح بها اختياريًا ثم نتجاهلها
  difficultyLevel: z.enum(["easy", "medium", "hard"]).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string().min(1)).optional().nullable(),
});

const mcOption = z.object({
  text: z.string().min(1, "نص الخيار مطلوب"),
  isCorrect: z.boolean(),
});

export const mcQuestion = baseQuestion.extend({
  questionType: z.literal("multiple_choice"),
  options: z.array(mcOption)
    .min(2, "يجب إدخال خيارين على الأقل")
    .refine(arr => arr.some(o => o.isCorrect), "يجب تحديد إجابة صحيحة واحدة على الأقل"),
});

export const tfQuestion = baseQuestion.extend({
  questionType: z.literal("true_false"),
  tfAnswer: z.union([z.literal(true), z.literal(false)]),
});

export const importItemSchema = z.union([mcQuestion, tfQuestion]);

export const questionsImportSchema = z.object({
  chapterId: z.string().min(1, "Chapter مطلوب"),
  items: z.array(importItemSchema).min(1, "لا توجد أسئلة في الدفعة"),
});

export type ImportItem = z.infer<typeof importItemSchema>;
export type QuestionsImportPayload = z.infer<typeof questionsImportSchema>;
