import { Prisma } from "@prisma/client";

import { adminAuthResponse, verifyAdmin } from "@/lib/admin-auth";
import { revalidateCollegeCache } from "@/lib/cache-invalidation";
import { prisma } from "@/lib/prisma";
import { bad, json, notFound } from "@/lib/server/admin-http";
import {
  deleteCollege,
  EducationStructureError,
  updateCollege,
} from "@/lib/server/education-structure";
import { updateCollegeSchema } from "@/validations/college";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  const auth = await verifyAdmin(req, "colleges:read");
  if (!auth.ok) return adminAuthResponse(auth);

  const { id } = await params;
  const college = await prisma.college.findUnique({
    where: { id },
    include: {
      university: { select: { id: true, name: true, code: true } },
      majors: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, isActive: true },
      },
      _count: { select: { majors: true } },
    },
  });
  if (!college) return notFound("college_not_found");
  return json({ data: college });
}

export async function PUT(req: Request, { params }: RouteContext) {
  const auth = await verifyAdmin(req, "colleges:write");
  if (!auth.ok) return adminAuthResponse(auth);

  const { id } = await params;
  const parsed = updateCollegeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const before = await prisma.college.findUnique({ where: { id }, select: { universityId: true } });
  if (!before) return notFound("college_not_found");

  try {
    const college = await updateCollege(id, parsed.data);
    revalidateCollegeCache({
      id,
      universityId: college.universityId,
      previousUniversityId: before.universityId,
    });
    return json({ data: college });
  } catch (error) {
    if (error instanceof EducationStructureError) return bad(error.code, undefined, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return bad("duplicate_college_identity_for_university", { fields: ["slug", "code"] }, 409);
    }
    throw error;
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const auth = await verifyAdmin(req, "colleges:write");
  if (!auth.ok) return adminAuthResponse(auth);

  const { id } = await params;
  try {
    const college = await deleteCollege(id);
    revalidateCollegeCache({ id, universityId: college.universityId });
    return json({ data: true });
  } catch (error) {
    if (error instanceof EducationStructureError) return bad(error.code, undefined, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return bad("college_has_majors", undefined, 409);
    }
    throw error;
  }
}
