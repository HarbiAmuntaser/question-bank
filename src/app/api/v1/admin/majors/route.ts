import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { listMajorsQuerySchema, createMajorSchema } from "@/validations/major";
import { unstable_cache, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";


export const dynamic = "force-dynamic";

// يطابق select بالضبط كي يتضمن _count
type MajorListRow = Prisma.MajorGetPayload<{
  select: {
    id: true;
    name: true;
    code: true;
    degreeType: true;
    isActive: true;
    createdAt: true;
    updatedAt: true;
    universityId: true;
    university: { select: { id: true; name: true; code: true } };
    _count: { select: { subjects: true } };
  };
}>;

const listMajorsCached = unstable_cache(
  async (q: Record<string, string | null>) => {
    const parsed = listMajorsQuerySchema.safeParse({
      page: q.page,
      pageSize: q.pageSize,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
      query: q.query ?? "",
      universityId: q.universityId ?? undefined,
    });
    if (!parsed.success) throw new Error("bad_query");

    const { page, pageSize, sortBy, sortOrder, query, universityId } = parsed.data;

    const andParts: Prisma.MajorWhereInput[] = [];
    if (query) {
      andParts.push({
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
      });
    }
    if (universityId) andParts.push({ universityId });

    const where: Prisma.MajorWhereInput = andParts.length ? { AND: andParts } : {};

    const [rows, total] = await Promise.all([
      prisma.major.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          code: true,
          degreeType: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          universityId: true,
          university: { select: { id: true, name: true, code: true } },
          _count: { select: { subjects: true } },
        },
      }) as Promise<MajorListRow[]>,
      prisma.major.count({ where }),
    ]);

    return {
      data: rows.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        degreeType: m.degreeType,
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        universityId: m.universityId,
        university: m.university,
        subjectsCount: m._count.subjects,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },
  ["admin-majors-list"],
  { revalidate: 3600, tags: ["majors"] }
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
  };

  try {
    const payload = await listMajorsCached(q);
    const headers = new Headers({ "cache-control": "public, s-maxage=3600, stale-while-revalidate=60" });
    return json(payload, { status: 200, headers });
  } catch {
    return bad("bad_query_params");
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = createMajorSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  try {
    const created = await prisma.major.create({
      data: {
        universityId: parsed.data.universityId,
        name: parsed.data.name,
        code: parsed.data.code ?? null,
        degreeType: parsed.data.degreeType ?? null,
        durationYears: parsed.data.durationYears ?? null,
        isActive: parsed.data.isActive,
        createdBy: auth.userId !== "api-key" ? auth.userId : null,
      },
    });

    revalidateTag("majors");
    return json({ data: created }, 201);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return bad("duplicate_code_for_university", { fields: ["code"] }, 409);
    }
    throw e;
  }
}
