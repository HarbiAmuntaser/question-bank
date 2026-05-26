/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { updateUserSchema } from "@/validations/user";
import { revalidateTag } from "next/cache";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(req: Request, { params }: RouteContext) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await params;

  const u = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, image: true },
  });
  if (!u) return json({ error: "not_found" }, 404);
  return json({ data: u }, 200);
}

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  // معالجة كلمة المرور إن وُجدت
  let password: string | undefined = undefined;
  if (parsed.data.password) {
    password = await bcrypt.hash(parsed.data.password, 10);
  }

  // تجنب تعارض الإيميل
  if (parsed.data.email) {
    const duplicate = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (duplicate && duplicate.id !== id) return bad("email_exists");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name ?? undefined,
      email: parsed.data.email ?? undefined,
      password: password ?? undefined,
      role: parsed.data.role ?? undefined,
      isActive: parsed.data.isActive ?? undefined,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  revalidateTag("users");
  return json({ data: updated, message: "تم تحديث المستخدم" }, 200);
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  await prisma.user.delete({ where: { id } });
  revalidateTag("users");
  return json({ message: "تم حذف المستخدم" }, 200);
}
