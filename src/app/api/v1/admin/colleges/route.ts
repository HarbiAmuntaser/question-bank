import { Prisma } from "@prisma/client";

import { adminAuthResponse, verifyAdmin } from "@/lib/admin-auth";
import { revalidateCollegeCache } from "@/lib/cache-invalidation";
import { prisma } from "@/lib/prisma";
import { bad, json } from "@/lib/server/admin-http";
import {
  createCollege,
  EducationStructureError,
} from "@/lib/server/education-structure";
import { createCollegeSchema, listCollegesQuerySchema } from "@/validations/college";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verifyAdmin(req, "colleges:read");
  if (!auth.ok) return adminAuthResponse(auth);

  const url = new URL(req.url);
  const parsed = listCollegesQuerySchema.safeParse({
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortOrder: url.searchParams.get("sortOrder") ?? undefined,
    query: url.searchParams.get("query") ?? "",
    universityId: url.searchParams.get("universityId") ?? undefined,
  });
  if (!parsed.success) return bad("bad_query_params", parsed.error.flatten());

  const { page, pageSize, sortBy, sortOrder, query, universityId } = parsed.data;
  const where: Prisma.CollegeWhereInput = {
    ...(universityId ? { universityId } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
            { university: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.college.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        universityId: true,
        name: true,
        slug: true,
        code: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        university: { select: { id: true, name: true, code: true } },
        _count: { select: { majors: true } },
      },
    }),
    prisma.college.count({ where }),
  ]);

  return json({
    data: rows.map((row) => ({ ...row, majorsCount: row._count.majors, _count: undefined })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req, "colleges:write");
  if (!auth.ok) return adminAuthResponse(auth);

  const parsed = createCollegeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  try {
    const college = await createCollege({ ...parsed.data, createdBy: auth.userId });
    revalidateCollegeCache({ id: college.id, universityId: college.universityId });
    return json({ data: college }, 201);
  } catch (error) {
    if (error instanceof EducationStructureError) return bad(error.code, undefined, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return bad("duplicate_college_identity_for_university", { fields: ["slug", "code"] }, 409);
    }
    throw error;
  }
}
