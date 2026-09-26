import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/server/admin-http";
import { verifyAdmin, adminAuthResponse } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateMajorCache } from "@/lib/cache-invalidation";
import {
  createMajorWithPlacement,
  EducationStructureError,
} from "@/lib/server/education-structure";
import { listMajorsQuerySchema, createMajorSchema } from "@/validations/major";

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
    collegeId: true;
    university: { select: { id: true; name: true; code: true } };
    college: { select: { id: true; name: true; code: true } };
    _count: { select: { subjects: true } };
  };
}>;

const listMajors = async (q: Record<string, string | null | undefined>) => {
    const parsed = listMajorsQuerySchema.safeParse({
      page: q.page,
      pageSize: q.pageSize,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
      query: q.query ?? "",
      universityId: q.universityId ?? undefined,
      collegeId: q.collegeId ?? undefined,
    });
    if (!parsed.success) throw new Error("bad_query");

    const { page, pageSize, sortBy, sortOrder, query, universityId, collegeId } = parsed.data;

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
          {
            college: {
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
    if (collegeId) andParts.push({ collegeId });

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
          collegeId: true,
          university: { select: { id: true, name: true, code: true } },
          college: { select: { id: true, name: true, code: true } },
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
        collegeId: m.collegeId,
        university: m.university,
        college: m.college,
        subjectsCount: m._count.subjects,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  };

export async function GET(req: Request) {
  const auth = await verifyAdmin(req, "majors:read");
  if (!auth.ok) return adminAuthResponse(auth);

  const url = new URL(req.url);
  const q: Record<string, string | null | undefined> = {
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortOrder: url.searchParams.get("sortOrder") ?? undefined,
    query: url.searchParams.get("query"),
    universityId: url.searchParams.get("universityId"),
    collegeId: url.searchParams.get("collegeId"),
  };

  try {
    const payload = await listMajors(q);
    const headers = new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });
    return json(payload, { status: 200, headers });
  } catch {
    return bad("bad_query_params");
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req, "majors:write");
  if (!auth.ok) return adminAuthResponse(auth);

  const body = await req.json().catch(() => null);
  const parsed = createMajorSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  try {
    const created = await createMajorWithPlacement({
      universityId: parsed.data.universityId,
      collegeId: parsed.data.collegeId,
      name: parsed.data.name,
      code: parsed.data.code ?? null,
      degreeType: parsed.data.degreeType ?? null,
      durationYears: parsed.data.durationYears ?? null,
      isActive: parsed.data.isActive,
      createdBy: auth.userId,
    });

    revalidateMajorCache({ id: created.id, universityId: created.universityId, collegeId: created.collegeId });
    return json({ data: created }, 201);
  } catch (e) {
    if (e instanceof EducationStructureError) return bad(e.code, undefined, e.status);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return bad("duplicate_code_for_university", { fields: ["code"] }, 409);
    }
    throw e;
  }
}
