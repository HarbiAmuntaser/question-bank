import { prisma } from "@/lib/prisma";
import { json, bad, unauth, notFound } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateSubjectCache } from "@/lib/cache-invalidation";
import type { Prisma } from "@prisma/client";
import { updateSubjectSchema, universitySubjectAcademicPeriodSchema } from "@/validations/subject";

// ملاحظة: نتوقع وجود updateSubjectSchema من "@/validations/subject"

// لتلافي تحذير Next.js عن params: نجعلها Promise وننتظرها
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;

  const s = await prisma.subject.findUnique({
    where: { id },
    include: {
      major: {
        include: {
          university: { select: { id: true, name: true, code: true } },
        },
      },
      _count: { select: { chapters: true } },
      chapters: {
        select: {
          id: true,
          name: true,
          chapterNumber: true,
          _count: { select: { questions: true } },
        },
      },
    },
  });

  if (!s) return notFound("المقرر غير موجود");
  return json(
    { data: s },
    { status: 200, headers: { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE } }
  );
}

export async function PUT(req: Request, ctx: Ctx) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;

  const body: unknown = await req.json().catch(() => null);
  const parsed = updateSubjectSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const exists = await prisma.subject.findUnique({
    where: { id },
    select: { id: true, majorId: true, year: true, semester: true },
  });
  if (!exists) return notFound("المقرر غير موجود");

  const p = parsed.data;
  const effectiveMajorId = p.majorId ?? exists.majorId;
  const major = await prisma.major.findUnique({
    where: { id: effectiveMajorId },
    select: { university: { select: { institutionType: true } } },
  });
  if (!major) return bad("major_not_found");

  const institutionType = major.university.institutionType;
  const effectiveYear = Object.prototype.hasOwnProperty.call(p, "year") ? p.year : exists.year;
  const effectiveSemester = Object.prototype.hasOwnProperty.call(p, "semester") ? p.semester : exists.semester;

  if (institutionType === "university") {
    const academicPeriod = universitySubjectAcademicPeriodSchema.safeParse({
      year: effectiveYear,
      semester: effectiveSemester,
    });
    if (!academicPeriod.success) return bad("validation_error", academicPeriod.error.flatten());
  }

  const data: Prisma.SubjectUpdateInput = {};

  if (typeof p.name !== "undefined") data.name = p.name;
  if (typeof p.isActive !== "undefined") data.isActive = p.isActive;
  if (typeof p.majorId !== "undefined") data.major = { connect: { id: p.majorId } };

  if (Object.prototype.hasOwnProperty.call(p, "code")) data.code = p.code ?? null;
  if (Object.prototype.hasOwnProperty.call(p, "creditHours"))
    data.creditHours = p.creditHours ?? null;
  if (Object.prototype.hasOwnProperty.call(p, "semester"))
    data.semester = p.semester ?? null;
  if (Object.prototype.hasOwnProperty.call(p, "year"))
    data.year = p.year ?? null;
  if (Object.prototype.hasOwnProperty.call(p, "description"))
    data.description = p.description ?? null;

  if (institutionType === "academy") {
    data.year = null;
    data.semester = null;
  }

  const updated = await prisma.subject.update({ where: { id }, data });

  revalidateSubjectCache({ id: updated.id, majorId: updated.majorId, previousMajorId: exists.majorId });
  return json({ data: updated });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;

  const target = await prisma.subject.findUnique({
    where: { id },
    select: { majorId: true },
  });

  try {
    await prisma.subject.delete({ where: { id } });
  } catch {
    return bad("فشل الحذف. تأكد من عدم وجود علاقات (فصول مرتبطة)");
  }

  revalidateSubjectCache({ id, majorId: target?.majorId });
  return json({ data: true });
}
