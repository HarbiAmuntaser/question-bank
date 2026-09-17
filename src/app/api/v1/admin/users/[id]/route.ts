/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/server/admin-http";
import { verifyAdmin, adminAuthResponse } from "@/lib/admin-auth";
import { updateUserSchema } from "@/validations/user";
import { revalidateTag } from "next/cache";
import { hashPassword } from "@/lib/server/auth-password";
import { AdminUserError, updateManagedUser, deleteManagedUser } from "@/lib/server/admin-users";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(req: Request, { params }: RouteContext) {
  const auth = await verifyAdmin(req, "users:manage");
  if (!auth.ok) return adminAuthResponse(auth);

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

  const auth = await verifyAdmin(req, "users:manage");
  if (!auth.ok) return adminAuthResponse(auth);

  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  // معالجة كلمة المرور إن وُجدت
  let password: string | undefined = undefined;
  if (parsed.data.password) {
    password = await hashPassword(parsed.data.password);
  }

  // تجنب تعارض الإيميل
  if (parsed.data.email) {
    const duplicate = await prisma.user.findUnique({ where: { normalizedEmail: parsed.data.email } });
    if (duplicate && duplicate.id !== id) return bad("email_exists");
  }

  try {
    const updated = await updateManagedUser(auth.userId, id, {
      name: parsed.data.name ?? undefined,
      email: parsed.data.email ?? undefined,
      password: password ?? undefined,
      role: parsed.data.role ?? undefined,
      isActive: parsed.data.isActive ?? undefined,
    });
    revalidateTag("users");
    return json({ data: updated, message: "تم تحديث المستخدم" }, 200);
  } catch (error) {
    if (error instanceof AdminUserError) return bad(error.message, undefined, error.status);
    throw error;
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req, "users:manage");
  if (!auth.ok) return adminAuthResponse(auth);

  try {
    await deleteManagedUser(auth.userId, id);
    revalidateTag("users");
    return json({ message: "تم حذف المستخدم" }, 200);
  } catch (error) {
    if (error instanceof AdminUserError) return bad(error.message, undefined, error.status);
    throw error;
  }
}
