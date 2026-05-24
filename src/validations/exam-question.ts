// src/validations/exam-question.ts
import { z } from "zod"

export const listExamQuestionsQuerySchema = z.object({
  examPaperId: z.string().min(1, "examPaperId required"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
})

const pageValue = z.union([z.coerce.number().int().min(1), z.null()])

export const createExamQuestionSchema = z.object({
  examPaperId: z.string().min(1, "examPaperId required"),
  questionId: z.string().min(1, "questionId required"),
  questionNumber: z.coerce.number().int().min(1, "questionNumber must be >= 1"),
  page: pageValue.optional().transform((v) => (typeof v === "number" ? v : v ?? null)),
  points: z.coerce.number().int().min(1).max(100).default(1),
})

export const updateExamQuestionSchema = z
  .object({
    questionId: z.string().min(1).optional(),
    questionNumber: z.coerce.number().int().min(1).optional(),
    page: pageValue.optional(),
    points: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "no_fields_to_update",
  })

export type CreateExamQuestionInput = z.infer<typeof createExamQuestionSchema>
export type UpdateExamQuestionInput = z.infer<typeof updateExamQuestionSchema>
