// src/app/api/v1/admin/exams/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { unstable_cache, revalidateTag } from "next/cache";
import { listExamPapersQuerySchema, createExamPaperSchema } from "@/validations/exam";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// ===== قائمة الأوراق مع ترقيم + فلاتر =====
const listExamsCached = unstable_cache(
  async (q: Record<string, string | null>) => {
    const parsed = listExamPapersQuerySchema.safeParse({
      page: q.page,
      pageSize: q.pageSize,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
      universityId: q.universityId ?? undefined,
      majorId: q.majorId ?? undefined,
      subjectId: q.subjectId ?? undefined,
      year: q.year ?? undefined,
      term: q.term ?? undefined,
      session: q.session ?? undefined,
      isPublished: q.isPublished ?? undefined,
    });
    if (!parsed.success) throw new Error("bad_query_params");

    const {
      page,
      pageSize,
      sortBy,
      sortOrder,
      universityId,
      majorId,
      subjectId,
      year,
      term,
      session,
      isPublished,
    } = parsed.data;

    // بناء where الديناميكي
    const andParts: Prisma.ExamPaperWhereInput[] = [];
    if (subjectId) andParts.push({ subjectId });
    if (year) andParts.push({ year });
    if (term) andParts.push({ term });
    if (session) andParts.push({ session });
    if (typeof isPublished === "boolean") andParts.push({ isPublished });

    // فلاتر متسلسلة عبر العلاقات
    if (majorId) {
      andParts.push({ subject: { majorId } });
    }
    if (universityId) {
      andParts.push({ subject: { major: { universityId } } });
    }

    const where: Prisma.ExamPaperWhereInput = andParts.length ? { AND: andParts } : {};

    // الاستعلامين: البيانات + العدد
    const [rows, total] = await Promise.all([
      prisma.examPaper.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              major: {
                select: {
                  id: true,
                  name: true,
                  university: {
                    select: { id: true, name: true, code: true },
                  },
                },
              },
            },
          },
          _count: { select: { questions: true } },
        },
      }),
      prisma.examPaper.count({ where }),
    ]);

    return {
      data: rows.map((e) => ({
        id: e.id,
        subject: e.subject,
        year: e.year,
        term: e.term,
        session: e.session,
        code: e.code,
        source: e.source,
        fileUrl: e.fileUrl,
        pagesCount: e.pagesCount,
        isPublished: e.isPublished,
        language: e.language,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        questionsCount: e._count.questions,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },
  ["admin-exams-list"],
  { revalidate: 3600, tags: ["exams"] }
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q: Record<string, string | null> = {
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    sortBy: url.searchParams.get("sortBy"),
    sortOrder: url.searchParams.get("sortOrder"),
    universityId: url.searchParams.get("universityId"),
    majorId: url.searchParams.get("majorId"),
    subjectId: url.searchParams.get("subjectId"),
    year: url.searchParams.get("year"),
    term: url.searchParams.get("term"),
    session: url.searchParams.get("session"),
    isPublished: url.searchParams.get("isPublished"),
  };

  try {
    const payload = await listExamsCached(q);
    const headers = new Headers({
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=60",
    });
    return json(payload, { status: 200, headers });
  } catch {
    return bad("bad_query_params");
  }
}

// ===== إنشاء ورقة جديدة =====
export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = createExamPaperSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const s = parsed.data;

  // أنشئ الورقة
  try {
    const created = await prisma.examPaper.create({
      data: {
        subjectId: s.subjectId,
        year: s.year,
        term: s.term,
        session: s.session ?? "regular",
        code: s.code ?? null,
        source: s.source ?? null,
        fileUrl: s.fileUrl ?? null,
        pagesCount: s.pagesCount ?? null,
        isPublished: s.isPublished ?? true,
        language: s.language ?? "ar",
        createdBy: auth.userId !== "api-key" ? auth.userId : null,
      },
    });

    // إبطال الكاش
    revalidateTag("exams");

    return json({ data: created, message: "تم إنشاء ورقة الاختبار بنجاح" }, 201);
  } catch (e: any) {
    // احتمال Unique constraint على (subjectId, year, term, session, code)
    return bad("create_failed", e?.message);
  }
}
