import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { publicQuizWhere, publicSubjectWhere } from "@/lib/server/public-content-visibility";

export class PaymentError extends Error {
  constructor(public readonly code: string, public readonly status = 400) { super(code); }
}

// The original switch now controls new sales, never an existing entitlement.
export function paymentV1Enabled() { return process.env.PAYMENT_V1_ENABLED === "true"; }
export function requirePaymentV1() {
  if (!paymentV1Enabled()) throw new PaymentError("payments_unavailable", 503);
}
function paymentPlanIdsFromEnvironment(name: "PAYMENT_LAUNCH_PLAN_IDS" | "PAYMENT_CODE_PLAN_IDS"): string[] {
  const raw = process.env[name] ?? "[]";
  if (raw.length > 20000) return [];
  try {
    const ids: unknown = JSON.parse(raw);
    if (!Array.isArray(ids) || ids.length > 200 || !ids.every((id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id))) return [];
    return [...new Set(ids as string[])];
  } catch { return []; }
}
export function paymentLaunchPlanIds(): string[] { return paymentPlanIdsFromEnvironment("PAYMENT_LAUNCH_PLAN_IDS"); }
export function paymentSalesEnabled() { return paymentV1Enabled() && paymentLaunchPlanIds().length > 0; }
export function paymentPlanOnSale(id: string) { return paymentSalesEnabled() && paymentLaunchPlanIds().includes(id); }
export function requirePaymentSales(ids?: string[]) {
  if (!paymentSalesEnabled()) throw new PaymentError("payments_unavailable", 503);
  if (ids?.some((id) => !paymentPlanOnSale(id))) throw new PaymentError("plan_not_in_launch", 409);
}
export function paymentReviewEnabled() { return process.env.PAYMENT_REVIEW_ENABLED === "true"; }
export function requirePaymentReview() {
  if (!paymentReviewEnabled()) throw new PaymentError("payment_review_unavailable", 503);
}
export function paymentCodesEnabled() { return process.env.PAYMENT_CODES_ENABLED === "true"; }
export function requirePaymentCodes() {
  if (!paymentCodesEnabled()) throw new PaymentError("payment_codes_unavailable", 503);
}
export function paymentCodePlanIds(): string[] { return paymentPlanIdsFromEnvironment("PAYMENT_CODE_PLAN_IDS"); }
export function paymentCodePlanEnabled(id: string) { return paymentCodesEnabled() && paymentCodePlanIds().includes(id); }
export function requirePaymentCodePlan(id: string) {
  requirePaymentCodes();
  if (!paymentCodePlanEnabled(id)) throw new PaymentError("code_plan_not_enabled", 409);
}

export const paymentSubjectSelect = {
  id: true, majorId: true, isActive: true,
  major: { select: { isActive: true, university: { select: { isActive: true, countryCode: true, institutionType: true } } } },
} satisfies Prisma.SubjectSelect;
export type PaymentSubject = Prisma.SubjectGetPayload<{ select: typeof paymentSubjectSelect }>;

export function isPaymentSubject(subject: PaymentSubject) {
  return subject.major.university.countryCode === "SA" && subject.major.university.institutionType === "university";
}

export function publishedSubjectWhere(): Prisma.SubjectWhereInput {
  return { AND: [publicSubjectWhere(), { isActive: true, major: { isActive: true, university: { isActive: true } } }] };
}

export function publishedPaymentQuizWhere(): Prisma.QuizWhereInput {
  return { isActive: true, AND: [publicQuizWhere(), {
    OR: [{ subjectId: null }, { subject: publishedSubjectWhere() }],
    questions: { every: { question: { isActive: true, chapter: { isActive: true, subject: publishedSubjectWhere() } } } },
  }] };
}

export function paymentSubjectWhere(): Prisma.SubjectWhereInput {
  return { AND: [publishedSubjectWhere(), { major: { university: { countryCode: "SA", institutionType: "university" } } }] };
}

export function paymentPlanWhere(): Prisma.PaidAccessPlanWhereInput {
  return { scopeType: "subject", majorId: null, subject: paymentSubjectWhere() };
}

export async function requirePaymentSubject(subjectId: string, db: Pick<Prisma.TransactionClient, "subject"> = prisma) {
  const subject = await db.subject.findFirst({ where: { id: subjectId, ...paymentSubjectWhere() }, select: paymentSubjectSelect });
  if (!subject) throw new PaymentError("payment_scope_not_allowed", 409);
  return subject;
}

export async function getPaymentStudent() {
  const user = await getCurrentUser();
  return user?.role === "student" && user.emailVerified && user.isActive ? user : null;
}

export async function requirePaymentStudent() {
  const user = await getPaymentStudent();
  if (!user) throw new PaymentError("student_signin_required", 401);
  return user;
}

export async function recheckPaymentStudent(tx: Prisma.TransactionClient, identity: { id: string; sessionVersion: number }) {
  const user = await tx.user.findUnique({ where: { id: identity.id }, select: { role: true, isActive: true, emailVerified: true, sessionVersion: true } });
  if (!user?.isActive || user.role !== "student" || !user.emailVerified || user.sessionVersion !== identity.sessionVersion) {
    throw new PaymentError("student_signin_required", 401);
  }
}
