import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import "server-only";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { safeCallbackPath } from "@/lib/auth-policy";
export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session?.user?.id || !Number.isInteger(session.user.sessionVersion)) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: {
    id: true, name: true, email: true, role: true, isActive: true, emailVerified: true, sessionVersion: true,
  } });
  if (!user?.isActive || user.sessionVersion !== session.user.sessionVersion) return null;
  return user;
}

export async function requireStudentAccount(callbackUrl = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/signin?callbackUrl=${encodeURIComponent(safeCallbackPath(callbackUrl))}`);
  if (user.role !== "student" || !user.emailVerified) redirect("/auth/forbidden");
  return user;
}
