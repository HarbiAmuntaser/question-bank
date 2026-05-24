/* Fixed Next 15 params typing */

// src/app/api/v1/admin/universities/[id]/route.ts

import { prisma } from "@/lib/prisma";
import { json, bad, unauth, notFound } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { updateUniversitySchema } from "@/validations/university";
import { revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

// GET /api/v1/admin/universities/[id]
export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;

  const u = await prisma.university.findUnique({
    where: { id },
    include: {
      majors: {
        select: { id: true, name: true, code: true, isActive: true },
      },
      _count: { select: { majors: true } },
    },
  });
  if (!u) return notFound("الجامعة غير موجودة");
  return json(
    { data: u },
    { status: 200, headers: { "cache-control": "public, s-maxage=3600" } }
  );
}

// PUT /api/v1/admin/universities/[id]
export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = updateUniversitySchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const exists = await prisma.university.findUnique({ where: { id } });
  if (!exists) return notFound("الجامعة غير موجودة");

  const payload = parsed.data;
  const data: Prisma.UniversityUpdateInput = {};

  if (typeof payload.name !== "undefined") data.name = payload.name;
  if (typeof payload.isActive !== "undefined") data.isActive = payload.isActive;
  if (typeof payload.countryCode !== "undefined" && payload.countryCode !== null) {
    const cc = payload.countryCode.trim().toUpperCase();
    if (cc) data.countryCode = cc;
  }
  if (typeof payload.institutionType !== "undefined" && payload.institutionType) {
    data.institutionType = payload.institutionType as any;
  }

  // خصائص اختيارية قابلة لأن تكون null
  if (Object.prototype.hasOwnProperty.call(payload, "code")) data.code = payload.code ?? null;
  if (Object.prototype.hasOwnProperty.call(payload, "city")) data.city = payload.city ?? null;
  if (Object.prototype.hasOwnProperty.call(payload, "region")) data.region = payload.region ?? null;
  if (Object.prototype.hasOwnProperty.call(payload, "logoUrl")) data.logoUrl = payload.logoUrl ?? null;

  const updated = await prisma.university.update({ where: { id }, data });

  revalidateTag("universities");
  return json({ data: updated });
}

// DELETE /api/v1/admin/universities/[id]
export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const hasMajors = await prisma.major.count({ where: { universityId: id } });
  if (hasMajors > 0) return bad("لا يمكن حذف الجامعة لوجود تخصصات مرتبطة بها");

  try {
    await prisma.university.delete({ where: { id } });
  } catch {
    return bad("فشل الحذف. تأكد من عدم وجود علاقات أخرى");
  }

  revalidateTag("universities");
  return json({ data: true });
}