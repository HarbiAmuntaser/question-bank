import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateSubjectCache } from "@/lib/cache-invalidation";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { createSubjectSchema, listSubjectsQuerySchema } from "@/validations/subject";

// ملاحظة: نتوقع وجود سكيمات الفاليديشن التالية:
// listSubjectsQuerySchema, createSubjectSchema
// من: "@/validations/subject"

export const dynamic = "force-dynamic";

// شكل الصف الذي نعيده من اللست (مع _count للـ chapters)
type SubjectListRow = Prisma.SubjectGetPayload<{
  select: {
    id: true;
    name: true;
    code: true;
    creditHours: true;
    semester: true;
    year: true;
    description: true;
    isActive: true;
    createdAt: true;
    updatedAt: true;
    majorId: true;
    major: {
      select: {
        id: true;
        name: true;
        code: true;
        university: { select: { id: true; name: true; code: true } };
      };
    };
    _count: { select: { chapters: true } };
  };
}>;

const listSubjectsCached = unstable_cache(
  async (q: Record<string, string | null>) => {
    // التحقق من الكويري سترينغ
    const parsed = listSubjectsQuerySchema.safeParse({
      page: q.page,
      pageSize: q.pageSize,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
      query: q.query ?? "",
      universityId: q.universityId ?? undefined,
      majorId: q.majorId ?? undefined,
    });
    if (!parsed.success) throw new Error("bad_query");
    const { page, pageSize, sortBy, sortOrder, query, universityId, majorId } = parsed.data;

    // بناء where بشكل آمن
    const andParts: Prisma.SubjectWhereInput[] = [];
    if (query) {
      andParts.push({
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          {
            major: {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { code: { contains: query, mode: "insensitive" } },
                {
                  university: {
                    OR: [
                      { name: { contains: query, mode: "insensitive" } },
                      { code: { contains: query, mode: "insensitive" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      });
    }
    if (universityId) andParts.push({ major: { universityId } });
    if (majorId) andParts.push({ majorId });

    const where: Prisma.SubjectWhereInput = andParts.length ? { AND: andParts } : {};

    const [rows, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          code: true,
          creditHours: true,
          semester: true,
          year: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          majorId: true,
          major: {
            select: {
              id: true,
              name: true,
              code: true,
              university: { select: { id: true, name: true, code: true } },
            },
          },
          _count: { select: { chapters: true } },
        },
      }) as Promise<SubjectListRow[]>,
      prisma.subject.count({ where }),
    ]);

    return {
      data: rows.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        creditHours: s.creditHours,
        semester: s.semester,
        year: s.year,
        description: s.description,
        isActive: s.isActive,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        majorId: s.majorId,
        major: s.major,
        chaptersCount: s._count.chapters,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },
  ["admin-subjects-list"],
  { revalidate: 3600, tags: ["subjects"] }
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
    query: url.searchParams.get("query"),
    universityId: url.searchParams.get("universityId"),
    majorId: url.searchParams.get("majorId"),
  };

  try {
    const payload = await listSubjectsCached(q);
    const headers = new Headers({
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
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
  const parsed = createSubjectSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const created = await prisma.subject.create({
    data: {
      majorId: parsed.data.majorId,
      name: parsed.data.name,
      code: parsed.data.code ?? null,
      creditHours: parsed.data.creditHours ?? null,
      semester: parsed.data.semester ?? null,
      year: parsed.data.year ?? null,
      description: parsed.data.description ?? null,
      isActive: parsed.data.isActive,
      createdBy: auth.userId !== "api-key" ? auth.userId : null,
    },
  });

  revalidateSubjectCache({ id: created.id, majorId: created.majorId });
  return json({ data: created }, 201);
}
