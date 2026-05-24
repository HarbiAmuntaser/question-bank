import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { unstable_cache, revalidateTag } from "next/cache";
import { listChaptersQuerySchema, createChapterSchema } from "@/validations/chapter";

export const dynamic = "force-dynamic";

// النوع العائد من select (يشمل subject + major + university + _count)
type ChapterListRow = {
  id: string;
  subjectId: string;
  name: string;
  chapterNumber: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  subject: {
    id: string;
    name: string;
    code: string | null;
    major: {
      id: string;
      name: string;
      code: string | null;
      university: { id: string; name: string; code: string | null };
    };
  };
  _count: { questions: number };
};

const listChaptersCached = unstable_cache(
  async (q: Record<string, string | null>) => {
    const parsed = listChaptersQuerySchema.safeParse({
      page: q.page,
      pageSize: q.pageSize,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
      query: q.query ?? "",
      universityId: q.universityId ?? undefined,
      majorId: q.majorId ?? undefined,
      subjectId: q.subjectId ?? undefined,
    });
    if (!parsed.success) throw new Error("bad_query");

    const { page, pageSize, sortBy, sortOrder, query, universityId, majorId, subjectId } = parsed.data;

    const andParts: Record<string, unknown>[] = [];

    // بحث شامل
    if (query) {
      andParts.push({
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { subject: { name: { contains: query, mode: "insensitive" } } },
          { subject: { code: { contains: query, mode: "insensitive" } } },
          { subject: { major: { name: { contains: query, mode: "insensitive" } } } },
          { subject: { major: { code: { contains: query, mode: "insensitive" } } } },
          { subject: { major: { university: { name: { contains: query, mode: "insensitive" } } } } },
          { subject: { major: { university: { code: { contains: query, mode: "insensitive" } } } } },
        ],
      });
    }

    // فلاتر متسلسلة
    if (universityId) {
      andParts.push({ subject: { major: { universityId } } });
    }
    if (majorId) {
      andParts.push({ subject: { majorId } });
    }
    if (subjectId) {
      andParts.push({ subjectId });
    }

    const where = andParts.length ? { AND: andParts } : {};

    const [rows, total] = await Promise.all([
      prisma.chapter.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy:
          sortBy === "chapterNumber"
            ? [{ chapterNumber: sortOrder }, { name: "asc" }]
            : { [sortBy]: sortOrder },
        select: {
          id: true,
          subjectId: true,
          name: true,
          chapterNumber: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
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
          _count: { select: { questions: true } },
        },
      }) as Promise<ChapterListRow[]>,
      prisma.chapter.count({ where }),
    ]);

    return {
      data: rows.map((c) => ({
        id: c.id,
        subjectId: c.subjectId,
        name: c.name,
        chapterNumber: c.chapterNumber,
        description: c.description,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        subject: c.subject,
        questionsCount: c._count.questions,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },
  ["admin-chapters-list"],
  { revalidate: 3600, tags: ["chapters"] }
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q: Record<string, string | null> = {
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    sortBy: url.searchParams.get("sortBy"),
    sortOrder: url.searchParams.get("sortOrder"),
    query: url.searchParams.get("query"),
    universityId: url.searchParams.get("universityId"),
    majorId: url.searchParams.get("majorId"),
    subjectId: url.searchParams.get("subjectId"),
  };

  try {
    const payload = await listChaptersCached(q);
    const headers = new Headers({
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=60",
    });
    return json(payload, { status: 200, headers });
  } catch {
    return bad("bad_query_params");
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = createChapterSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const created = await prisma.chapter.create({
    data: {
      subjectId: parsed.data.subjectId,
      name: parsed.data.name,
      chapterNumber: parsed.data.chapterNumber ?? null,
      description: parsed.data.description ?? null,
      learningObjectives: parsed.data.learningObjectives ?? [],
      isActive: parsed.data.isActive,
      // createdBy: auth.userId !== "api-key" ? auth.userId : null, // إن أحببت
    },
  });

  revalidateTag("chapters");
  return json({ data: created }, 201);
}
