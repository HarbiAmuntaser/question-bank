import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateQuestionCache } from "@/lib/cache-invalidation";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { listQuestionsQuerySchema, createQuestionSchema } from "@/validations/question";

export const dynamic = "force-dynamic";

// الشكل المحدد لقائمة الأسئلة (للعرض في الجدول)
type QuestionListRow = Prisma.QuestionGetPayload<{
  select: {
    id: true;
    chapterId: true;
    questionText: true;
    questionType: true;
    difficultyLevel: true;
    points: true;
    isActive: true;
    createdAt: true;
    updatedAt: true;
    tags: true;
    chapter: {
      select: {
        id: true;
        name: true;
        chapterNumber: true;
        subject: {
          select: {
            id: true;
            name: true;
            code: true;
            major: {
              select: {
                id: true;
                name: true;
                code: true;
                university: { select: { id: true, name: true, code: true } },
              };
            };
          };
        };
      };
    };
  };
}>;

const listQuestionsCached = unstable_cache(
  async (q: Record<string, string | null>) => {
    const parsed = listQuestionsQuerySchema.safeParse({
      page: q.page,
      pageSize: q.pageSize,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,

      universityId: q.universityId ?? undefined,
      majorId: q.majorId ?? undefined,
      subjectId: q.subjectId ?? undefined,
      chapterId: q.chapterId ?? undefined,
    });
    if (!parsed.success) throw new Error("bad_query");

    const { page, pageSize, sortBy, sortOrder, universityId, majorId, subjectId, chapterId } =
      parsed.data;

    const andParts: Prisma.QuestionWhereInput[] = [];

    // فلاتر متسلسلة
    if (universityId) {
      andParts.push({ chapter: { subject: { major: { universityId } } } });
    }
    if (majorId) {
      andParts.push({ chapter: { subject: { majorId } } });
    }
    if (subjectId) {
      andParts.push({ chapter: { subjectId } });
    }
    if (chapterId) {
      andParts.push({ chapterId });
    }

    const where: Prisma.QuestionWhereInput = andParts.length ? { AND: andParts } : {};

    const orderBy: Prisma.QuestionOrderByWithRelationInput | Prisma.QuestionOrderByWithRelationInput[] =
      sortBy === "difficultyLevel"
        ? [{ difficultyLevel: sortOrder }, { createdAt: "desc" }]
        : { [sortBy]: sortOrder };

    const [rows, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          chapterId: true,
          questionText: true,
          questionType: true,
          difficultyLevel: true,
          points: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          tags: true,
          chapter: {
            select: {
              id: true,
              name: true,
              chapterNumber: true,
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
      }) as Promise<QuestionListRow[]>,
      prisma.question.count({ where }),
    ]);

    return {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },
  ["admin-questions-list"],
  { revalidate: 3600, tags: ["questions"] }
);

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const url = new URL(req.url);
  const q: Record<string, string | null> = {
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    sortBy: url.searchParams.get("sortBy"),
    sortOrder: url.searchParams.get("sortOrder"),
    universityId: url.searchParams.get("universityId"),
    majorId: url.searchParams.get("majorId"),
    subjectId: url.searchParams.get("subjectId"),
    chapterId: url.searchParams.get("chapterId"),
  };

  try {
    const payload = await listQuestionsCached(q);
    const headers = new Headers({
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json(payload, { status: 200, headers });
  } catch {
    return bad("bad_query_params");
  }
}
// src/app/api/v1/admin/questions/route.ts



// ... (GET كما هو بدون تغيير)

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = createQuestionSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const d = parsed.data;

  const created = await prisma.question.create({
    data: {
      chapterId: d.chapterId,
      questionText: d.questionText,
      questionType: d.questionType,
      difficultyLevel: d.difficultyLevel,
      points: d.points,
      explanation: d.explanation ?? null,
      imageUrl: d.imageUrl ?? null,
      tags: d.tags ?? [],
      isActive: d.isActive,

      // ✅ now: create options for multiple_choice OR true_false (or any type if provided by schema)
      options:
        d.options?.length
          ? {
              create: d.options.map((o, idx) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
                optionOrder: o.optionOrder ?? idx + 1,
              })),
            }
          : undefined,

      // createdBy: auth.userId !== "api-key" ? auth.userId : null,
    },
  });

  const chapter = await prisma.chapter.findUnique({
    where: { id: created.chapterId },
    select: { subjectId: true },
  });
  revalidateQuestionCache({ subjectId: chapter?.subjectId });
  return json({ data: created, message: "question_created" }, 201);
}

