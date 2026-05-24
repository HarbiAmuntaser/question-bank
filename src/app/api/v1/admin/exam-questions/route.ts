// src/app/api/v1/admin/exam-questions/route.ts
import { prisma } from "@/lib/prisma"
import { json, bad, unauth } from "@/lib/http"
import { verifyAdmin } from "@/lib/admin-auth"
import { revalidateTag } from "next/cache"
import { Prisma } from "@prisma/client"
import {
  listExamQuestionsQuerySchema,
  createExamQuestionSchema,
} from "@/validations/exam-question"

export const dynamic = "force-dynamic"

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

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = listExamQuestionsQuerySchema.safeParse({
    examPaperId: url.searchParams.get("examPaperId"),
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
  })

  if (!parsed.success) {
    return bad("bad_query_params", parsed.error.flatten())
  }

  const { examPaperId, page, pageSize } = parsed.data

  const [rows, total] = await Promise.all([
    prisma.examQuestion.findMany({
      where: { examPaperId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { questionNumber: "asc" },
      include: questionInclude,
    }),
    prisma.examQuestion.count({ where: { examPaperId } }),
  ])

  return json(
    {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
    200,
  )
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return unauth()

  const body = await req.json().catch(() => null)
  const parsed = createExamQuestionSchema.safeParse(body)
  if (!parsed.success) return bad("validation_error", parsed.error.flatten())

  const { examPaperId, questionId, questionNumber, page, points } = parsed.data

  const exam = await prisma.examPaper.findUnique({
    where: { id: examPaperId },
    select: { id: true, subjectId: true },
  })
  if (!exam) return bad("exam_not_found", undefined, 404)

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, chapter: { select: { subjectId: true } } },
  })
  if (!question) return bad("question_not_found", undefined, 404)
  if (question.chapter.subjectId !== exam.subjectId) {
    return bad("question_not_in_exam_subject")
  }

  try {
    const created = await prisma.examQuestion.create({
      data: {
        examPaperId,
        questionId,
        questionNumber,
        page,
        points,
      },
      include: questionInclude,
    })

    revalidateTag("exams")
    return json({ data: created, message: "exam_question_created" }, 201)
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return bad("duplicate_question_number_or_question", undefined, 409)
    }
    throw e
  }
}
