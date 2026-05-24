// src/app/api/v1/admin/exam-questions/[id]/route.ts
import { prisma } from "@/lib/prisma"
import { json, bad, unauth } from "@/lib/http"
import { verifyAdmin } from "@/lib/admin-auth"
import { revalidateTag } from "next/cache"
import { Prisma } from "@prisma/client"
import { updateExamQuestionSchema } from "@/validations/exam-question"

const questionInclude = {
  question: {
    include: {
      options: { orderBy: { optionOrder: "asc" } },
      chapter: {
        select: {
          id: true,
          name: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              major: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  university: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      },
    },
  },
} as const

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return unauth()

  const { id } = await ctx.params
  if (!id) return bad("missing_id")

  const body = await req.json().catch(() => null)
  const parsed = updateExamQuestionSchema.safeParse(body)
  if (!parsed.success) return bad("validation_error", parsed.error.flatten())

  const existing = await prisma.examQuestion.findUnique({
    where: { id },
    include: { examPaper: { select: { id: true, subjectId: true } } },
  })

  if (!existing) return bad("not_found", undefined, 404)

  if (parsed.data.questionId) {
    const question = await prisma.question.findUnique({
      where: { id: parsed.data.questionId },
      select: { id: true, chapter: { select: { subjectId: true } } },
    })
    if (!question) return bad("question_not_found", undefined, 404)
    if (question.chapter.subjectId !== existing.examPaper.subjectId) {
      return bad("question_not_in_exam_subject")
    }
  }

  try {
    const updated = await prisma.examQuestion.update({
      where: { id },
      data: {
        questionId: parsed.data.questionId ?? undefined,
        questionNumber: parsed.data.questionNumber ?? undefined,
        page:
          parsed.data.page === undefined
            ? undefined
            : parsed.data.page,
        points: parsed.data.points ?? undefined,
      },
      include: questionInclude,
    })

    revalidateTag("exams")
    return json({ data: updated, message: "exam_question_updated" }, 200)
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return bad("duplicate_question_number_or_question", undefined, 409)
    }
    throw e
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return unauth()

  const { id } = await ctx.params
  if (!id) return bad("missing_id")

  try {
    await prisma.examQuestion.delete({ where: { id } })
    revalidateTag("exams")
    return json({ message: "exam_question_deleted" }, 200)
  } catch (e: any) {
    return bad("delete_failed", e?.message)
  }
}
