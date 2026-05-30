import { z } from "zod";

export const listQuizzesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(["createdAt", "title", "totalQuestions", "timeLimit"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  // فلاتر اختيارية
  universityId: z.string().min(1).optional(),
  majorId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
});

const QuestionTypeEnum = z.enum(["multiple_choice", "true_false", "short_answer", "essay"]);
const QuizAccessTypeEnum = z.enum(["inherit", "free", "paid"]);

export const quizGenerationSettingsSchema = z.object({
  title: z.string().min(1, "title_required"),
  questionCount: z.coerce.number().int().min(0).default(0),
  timeLimit: z.coerce.number().int().min(1).max(180).default(30),
  difficulty: z.enum(["mixed", "easy", "medium", "hard"]).default("mixed"),
  questionTypes: z.array(QuestionTypeEnum).optional().default([]),
  randomize: z.boolean().default(true),
  selectedChapters: z.array(z.string().min(1)).min(1, "select_at_least_one_chapter"),
  accessType: QuizAccessTypeEnum.default("inherit"),
  isFreePreview: z.boolean().default(false),
});
