import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma, type User, type UserAuthTokenPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeCallbackPath } from "@/lib/auth-policy";
import { authOrigin } from "@/lib/server/auth-config";
import { comparePassword, hashPassword } from "@/lib/server/auth-password";
import { sendAuthMail } from "@/lib/server/auth-mail";
import { classifySmtpFailure, type AuthFailureStage } from "@/lib/server/student-auth-diagnostic";

export class InvalidAuthTokenError extends Error {
  constructor() { super("invalid_or_expired_token"); }
}
function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }

async function issueToken(user: Pick<User, "id" | "email" | "sessionVersion">, purpose: UserAuthTokenPurpose, callback: unknown, onStage?: (stage: AuthFailureStage) => void) {
  onStage?.("token_create");
  const raw = randomBytes(32).toString("base64url");
  const token = await prisma.userAuthToken.create({ data: {
    userId: user.id, purpose, tokenHash: tokenHash(raw), sessionVersion: user.sessionVersion,
    callbackPath: safeCallbackPath(callback),
    expiresAt: new Date(Date.now() + (purpose === "verify_email" ? 24 * 60 : 30) * 60_000),
  } });
  onStage?.("config");
  const link = new URL(purpose === "verify_email" ? "/auth/verify-email" : "/auth/reset-password", authOrigin());
  link.searchParams.set("token", raw);
  onStage?.("smtp_connect");
  try {
    await sendAuthMail(user.email,
      purpose === "verify_email" ? "تأكيد بريدك في مستواك" : "استعادة كلمة المرور في مستواك",
      (purpose === "verify_email" ? "لتأكيد حسابك، افتح الرابط وأدخل كلمة المرور التي اخترتها أثناء التسجيل.\n" : "لاختيار كلمة مرور جديدة، افتح الرابط التالي خلال 30 دقيقة.\n") +
      link.href + "\n\nإذا لم تطلب ذلك، تجاهل هذه الرسالة. لا تشارك هذا الرابط مع أي شخص.");
  } catch (error) {
    const smtpStage = onStage ? classifySmtpFailure(error) : undefined;
    onStage?.("token_cleanup");
    await prisma.userAuthToken.deleteMany({ where: { id: token.id } });
    if (smtpStage) onStage?.(smtpStage);
    throw error;
  }
}

export async function registerStudent(input: { name: string; email: string; password: string; callbackUrl?: string }) {
  const password = await hashPassword(input.password);
  let user = await prisma.user.findUnique({ where: { normalizedEmail: input.email } });
  if (!user) {
    try {
      user = await prisma.user.create({ data: {
        name: input.name, email: input.email, normalizedEmail: input.email, password,
        role: "student", isActive: true, emailVerified: null,
      } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      user = await prisma.user.findUnique({ where: { normalizedEmail: input.email } });
    }
  }
  // Repeated registration never changes an existing password, role or profile.
  if (user?.role === "student" && user.isActive && !user.emailVerified) await issueToken(user, "verify_email", input.callbackUrl);
}

export async function requestStudentEmail(email: string, purpose: UserAuthTokenPurpose, callback?: string, onStage?: (stage: AuthFailureStage) => void) {
  onStage?.("user_lookup");
  const user = await prisma.user.findUnique({ where: { normalizedEmail: email } });
  if (!user || user.role !== "student" || !user.isActive || (purpose === "verify_email" && user.emailVerified)) return;
  await issueToken(user, purpose, callback, onStage);
}

export async function consumeStudentToken(raw: string, purpose: UserAuthTokenPurpose, password: string): Promise<string> {
  const hash = tokenHash(raw);
  const initial = await prisma.userAuthToken.findUnique({ where: { tokenHash: hash }, include: { user: true } });
  if (!initial || initial.purpose !== purpose || initial.expiresAt <= new Date() || initial.user.role !== "student" || !initial.user.isActive) throw new InvalidAuthTokenError();
  if (purpose === "verify_email" && !(await comparePassword(password, initial.user.password))) throw new InvalidAuthTokenError();
  const newHash = purpose === "reset_password" ? await hashPassword(password) : undefined;
  const callback = await prisma.$transaction(async (tx) => {
    // Serialize token consumers and administrative changes on the user first.
    await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${initial.userId} FOR UPDATE`;
    const token = await tx.userAuthToken.findUnique({ where: { tokenHash: hash }, include: { user: true } });
    if (!token || token.purpose !== purpose || token.expiresAt <= new Date() || !token.user.isActive || token.user.role !== "student" ||
        token.sessionVersion !== token.user.sessionVersion || token.user.password !== initial.user.password) throw new InvalidAuthTokenError();
    if (purpose === "verify_email" && token.user.emailVerified) throw new InvalidAuthTokenError();
    await tx.user.update({ where: { id: token.userId }, data: {
      ...(newHash ? { password: newHash } : {}), emailVerified: token.user.emailVerified ?? new Date(), sessionVersion: { increment: 1 },
    } });
    await tx.userAuthToken.deleteMany({ where: { userId: token.userId } });
    return safeCallbackPath(token.callbackPath);
  });
  if (purpose === "reset_password") {
    // Notification failure must not undo a committed password reset.
    await sendAuthMail(initial.user.email, "تم تغيير كلمة مرور مستواك", "تم تغيير كلمة مرور حسابك وإنهاء جلساته السابقة. إن لم تقم بذلك، استعد حسابك وتواصل مع الدعم.")
      .catch(() => console.error("auth_password_notification_failed"));
  }
  return callback;
}
