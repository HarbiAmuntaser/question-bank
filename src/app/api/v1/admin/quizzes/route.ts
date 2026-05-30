// src/app/api/v1/admin/quizzes/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateQuizCache } from "@/lib/cache-invalidation";
import { unstable_cache } from "next/cache";
import { listQuizzesQuerySchema, quizGenerationSettingsSchema } from "@/validations/quiz";

export const dynamic = "force-dynamic";

// Fisher–Yates shuffle
function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const listQuizzesCached = unstable_cache(
  async (q: {
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    universityId?: string;
    majorId?: string;
    subjectId?: string;
  }) => {
    const raw = {
      page: q.page ?? undefined,
      pageSize: q.pageSize ?? undefined,
      sortBy: (q.sortBy as any) ?? undefined,
      sortOrder: (q.sortOrder as any) ?? undefined,
      universityId: q.universityId ?? undefined,
      majorId: q.majorId ?? undefined,
      subjectId: q.subjectId ?? undefined,
    };

    const parsed = listQuizzesQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(JSON.stringify(parsed.error.flatten()));
    }

    const { page, pageSize, sortBy, sortOrder, universityId, majorId, subjectId } = parsed.data;

    // فلترة بناء على وجود أي سؤال ضمن المسار المختار
    const andFilters: any[] = [];
    if (universityId) {
      andFilters.push({
        questions: {
          some: { question: { chapter: { subject: { major: { universityId } } } } },
        },
      });
    }
    if (majorId) {
      andFilters.push({
        questions: {
          some: { question: { chapter: { subject: { majorId } } } },
        },
      });
    }
    if (subjectId) {
      andFilters.push({
        questions: {
          some: { question: { chapter: { subjectId } } },
        },
      });
    }

    const where = andFilters.length ? { AND: andFilters } : {};

    const [rows, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { questions: true, attempts: true } },
        },
      }),
      prisma.quiz.count({ where }),
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
  ["admin-quizzes-list"],
  { revalidate: 3600, tags: ["quizzes"] }
);

export async function GET(req: Request) {
  // ✅ حماية GET لأنّه Admin API
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const url = new URL(req.url);
  const q = {
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortOrder: (url.searchParams.get("sortOrder") as "asc" | "desc" | null) ?? undefined,
    universityId: url.searchParams.get("universityId") ?? undefined,
    majorId: url.searchParams.get("majorId") ?? undefined,
    subjectId: url.searchParams.get("subjectId") ?? undefined,
  };

  try {
    const payload = await listQuizzesCached(q);
    const headers = new Headers({
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json(payload, { status: 200, headers });
  } catch (e) {
    console.error("listQuizzesCached error:", e instanceof Error ? e.message : e);
    return bad("bad_query_params");
  }
}

// ✅ POST: توليد اختبار
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = quizGenerationSettingsSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const s = parsed.data;

  // اجلب subjectId من الفصول المختارة (لو كلها نفس المقرر)
  const chapters = await prisma.chapter.findMany({
    where: { id: { in: s.selectedChapters } },
    select: { subjectId: true },
  });
  const distinctSubjectIds = Array.from(new Set(chapters.map((c) => c.subjectId).filter(Boolean))) as string[];
  const quizSubjectId = distinctSubjectIds.length === 1 ? distinctSubjectIds[0] : null;

  // فلترة الأسئلة
  const where: any = {
    chapterId: { in: s.selectedChapters },
    isActive: true,
  };
  if (s.difficulty !== "mixed") where.difficultyLevel = s.difficulty;
  if (s.questionTypes?.length) where.questionType = { in: s.questionTypes };

  const all = await prisma.question.findMany({
    where,
    select: { id: true, points: true },
  });

  if (!all.length) {
    return json({ message: "لا توجد أسئلة متاحة للفصول المختارة." }, { status: 400 });
  }

  let picked = [...all];
  if (s.randomize) shuffleInPlace(picked);

  // ✅ questionCount=0 يعني خذ كل المتاح
  if (s.questionCount > 0) picked = picked.slice(0, Math.min(s.questionCount, picked.length));

  const totalPoints = picked.reduce((sum, q) => sum + (q.points ?? 0), 0);

  // إنشاء الاختبار + ربط الأسئلة
  const created = await prisma.quiz.create({
    data: {
      title: s.title.trim(),
      timeLimit: s.timeLimit,
      totalQuestions: picked.length,
      totalPoints,
      isActive: true,
      accessType: s.accessType,
      isFreePreview: s.isFreePreview,
      subjectId: quizSubjectId,
      questions: {
        create: picked.map((q, idx) => ({
          questionId: q.id,
          questionOrder: idx + 1,
        })),
      },
    },
    include: {
      _count: { select: { questions: true } },
    },
  });

  revalidateQuizCache({ id: created.id, subjectId: created.subjectId });
  return json({ data: created, message: "تم إنشاء الاختبار بنجاح" }, { status: 201 });
}
