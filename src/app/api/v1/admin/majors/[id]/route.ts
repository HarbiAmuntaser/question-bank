// src/app/api/v1/admin/majors/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad, unauth, notFound } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateMajorCache } from "@/lib/cache-invalidation";
import { updateMajorSchema } from "@/validations/major";
import type { Prisma } from "@prisma/client";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: RouteParams) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;
  const m = await prisma.major.findUnique({
    where: { id },
    include: {
      university: { select: { id: true, name: true, code: true } },
      _count: { select: { subjects: true } },
      subjects: {
        select: { id: true, name: true, code: true, isActive: true, _count: { select: { chapters: true } } },
      },
    },
  });
  if (!m) return notFound("التخصص غير موجود");
  return json({ data: m }, { status: 200, headers: { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE } });
}

export async function PUT(req: Request, ctx: RouteParams) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;

  const body: unknown = await req.json().catch(() => null);
  const parsed = updateMajorSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const exists = await prisma.major.findUnique({ where: { id } });
  if (!exists) return notFound("التخصص غير موجود");

  const p = parsed.data;
  const data: Prisma.MajorUpdateInput = {};

  if (typeof p.name !== "undefined") data.name = p.name;
  if (typeof p.universityId !== "undefined") data.university = { connect: { id: p.universityId } };
  if (typeof p.isActive !== "undefined") data.isActive = p.isActive;

  if (Object.prototype.hasOwnProperty.call(p, "code")) data.code = p.code ?? null;
  if (Object.prototype.hasOwnProperty.call(p, "degreeType")) data.degreeType = p.degreeType ?? null;
  if (Object.prototype.hasOwnProperty.call(p, "durationYears")) data.durationYears = p.durationYears ?? null;

  const updated = await prisma.major.update({ where: { id }, data });
  revalidateMajorCache({ id: updated.id, universityId: updated.universityId });
  return json({ data: updated });
}

export async function DELETE(req: Request, ctx: RouteParams) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;

  const target = await prisma.major.findUnique({
    where: { id },
    select: { universityId: true },
  });

  try {
    await prisma.major.delete({ where: { id } });
  } catch {
    return bad("فشل الحذف. تأكد من عدم وجود علاقات (مواد مرتبطة)");
  }

  revalidateMajorCache({ id, universityId: target?.universityId });
  return json({ data: true });
}
