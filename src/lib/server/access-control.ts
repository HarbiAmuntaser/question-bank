import "server-only";
import type { Prisma, QuizAccessType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AccessPlan, AccessStatus } from "@/lib/payment-access";
import { publicMajorWhere } from "@/lib/server/public-content-visibility";
import {
  getPaymentStudent, isPaymentSubject, paymentPlanWhere, paymentSubjectSelect,
  paymentCodePlanEligibilityWhere, paymentCodesEnabled, paymentLaunchPlanIds, paymentSalesEnabled,
  publishedPaymentQuizWhere, publishedSubjectWhere, type PaymentSubject,
} from "@/lib/server/payment-scope";
import { hashGuestAccessToken, isGuestAccessToken } from "@/lib/server/subscription-code";

export type StudySummaryAccessStatus = AccessStatus & {
  summaryId: string | null;
  accessType: QuizAccessType | null;
  effectiveAccessType: Exclude<QuizAccessType, "inherit"> | null;
};

export const accessPlanSelect = {
  id: true, scopeType: true, title: true, description: true, price: true, currency: true,
  whatsappNumber: true, telegramUsername: true, contactMessage: true, majorId: true, subjectId: true,
} satisfies Prisma.PaidAccessPlanSelect;

export function serializeAccessPlan(plan: Prisma.PaidAccessPlanGetPayload<{ select: typeof accessPlanSelect }>): AccessPlan {
  return { ...plan, scopeType: "subject", price: plan.price?.toString() ?? null };
}

function status(reason: AccessStatus["reason"], subject?: PaymentSubject | null): AccessStatus {
  const allowed = ["free", "free_preview", "no_paid_plan", "out_of_scope", "entitled"].includes(reason);
  return { allowed, reason, canPurchase: false, canRedeemCode: false, requiresSubscription: reason === "paid_access_required" || reason === "student_signin_required",
    scopeType: subject && isPaymentSubject(subject) ? "subject" : null,
    subjectId: subject?.id ?? null, majorId: subject?.majorId ?? null, plan: null, entitlementId: null,
    codeGrantId: null, accessSource: null, expiresAt: null };
}

// Caches are private to this invocation, never shared across visitors or requests.
function accessReader(guestSessionToken?: string | null) {
  let student: ReturnType<typeof getPaymentStudent> | undefined;
  const plans = new Map<string, ReturnType<typeof loadPlans>>();
  const codePlans = new Map<string, Promise<boolean>>();
  const guestTokenHash = guestSessionToken && isGuestAccessToken(guestSessionToken)
    ? hashGuestAccessToken(guestSessionToken)
    : null;
  async function loadPlans(subjectId: string) {
    const rows = await prisma.paidAccessPlan.findMany({
      where: { subjectId, ...paymentPlanWhere() },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      select: { ...accessPlanSelect, isActive: true },
    });
    const saleIds = paymentSalesEnabled() ? new Set(paymentLaunchPlanIds()) : new Set<string>();
    const commerce = rows.find((plan) => plan.isActive && saleIds.has(plan.id)) ?? null;
    return {
      policy: rows[0] ?? null,
      commerce,
      display: commerce ?? rows.find((plan) => plan.isActive) ?? rows[0] ?? null,
    };
  }
  function plansFor(subjectId: string) {
    if (!plans.has(subjectId)) plans.set(subjectId, loadPlans(subjectId));
    return plans.get(subjectId)!;
  }
  function codePlanFor(subjectId: string) {
    if (!codePlans.has(subjectId)) {
      codePlans.set(subjectId, !paymentCodesEnabled() ? Promise.resolve(false) : prisma.paidAccessPlan.findFirst({
        where: { ...paymentCodePlanEligibilityWhere(), isActive: true, subjectId, ...paymentPlanWhere() }, select: { id: true },
      }).then(Boolean));
    }
    return codePlans.get(subjectId)!;
  }
  return async (subject: PaymentSubject, accessType: QuizAccessType, preview = false): Promise<AccessStatus> => {
    // Publication is checked by the resolver before reaching this payment-only policy.
    if (!isPaymentSubject(subject)) return status("out_of_scope", subject);
    if (accessType === "free") return status("free", subject);
    if (preview) return status("free_preview", subject);
    const availablePlans = await plansFor(subject.id);
    if (accessType === "inherit" && !availablePlans.policy) return status("no_paid_plan", subject);
    const options = { canPurchase: Boolean(availablePlans.commerce), canRedeemCode: await codePlanFor(subject.id),
      plan: availablePlans.display ? serializeAccessPlan(availablePlans.display) : null };
    student ??= getPaymentStudent();
    const user = await student;
    const now = new Date();
    const [entitlement, accountGrant, guestBinding] = await Promise.all([
      user ? prisma.accessEntitlement.findFirst({ where: { userId: user.id, scopeType: "subject", subjectId: subject.id,
        isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [{ OR: [{ codeId: null }, { code: { plan: { subjectId: subject.id, ...paymentPlanWhere() } } }] }] },
        orderBy: { createdAt: "desc" }, select: { id: true, expiresAt: true } }) : Promise.resolve(null),
      user ? prisma.codeAccessGrant.findFirst({ where: { userId: user.id, principalType: "account", subjectId: subject.id,
        isActive: true, startsAt: { lte: now }, expiresAt: { gt: now } },
        orderBy: { createdAt: "desc" }, select: { id: true, expiresAt: true } }) : Promise.resolve(null),
      guestTokenHash ? prisma.codeAccessSessionBinding.findFirst({ where: { revokedAt: null,
        session: { tokenHash: guestTokenHash, revokedAt: null, expiresAt: { gt: now } },
        grant: { principalType: "guest", subjectId: subject.id, isActive: true, startsAt: { lte: now }, expiresAt: { gt: now } } },
        orderBy: { boundAt: "desc" }, select: { grant: { select: { id: true, expiresAt: true } } } }) : Promise.resolve(null),
    ]);
    const source = entitlement ? "manual" : accountGrant ? "account_code" : guestBinding ? "guest_code" : null;
    const grant = accountGrant ?? guestBinding?.grant ?? null;
    if (source) return { ...status("entitled", subject), ...options, entitlementId: entitlement?.id ?? null,
      codeGrantId: grant?.id ?? null, accessSource: source, expiresAt: (entitlement?.expiresAt ?? grant?.expiresAt)?.toISOString() ?? null };
    if (!user && !guestTokenHash) return { ...status("student_signin_required", subject), ...options };
    return { ...status(options.canPurchase || options.canRedeemCode ? "paid_access_required" : "payments_unavailable", subject), ...options };
  };
}

export async function checkScopeAccess(input: { subjectId?: string | null; majorId?: string | null; guestSessionToken?: string | null }): Promise<AccessStatus> {
  if (input.subjectId) {
    const subject = await prisma.subject.findFirst({ where: { id: input.subjectId, ...publishedSubjectWhere() }, select: paymentSubjectSelect });
    return subject ? accessReader(input.guestSessionToken)(subject, "inherit") : status("not_found");
  }
  if (input.majorId) {
    const major = await prisma.major.findFirst({ where: { id: input.majorId, AND: [publicMajorWhere(), { isActive: true, university: { isActive: true } }] }, select: { id: true } });
    return major ? { ...status("out_of_scope"), majorId: major.id } : status("not_found");
  }
  return status("missing_context");
}

async function quizAccess(quizId: string, read: ReturnType<typeof accessReader>): Promise<AccessStatus> {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, ...publishedPaymentQuizWhere() },
    select: { accessType: true, isFreePreview: true, subject: { select: paymentSubjectSelect },
      questions: { select: { question: { select: { chapter: { select: { subject: { select: paymentSubjectSelect } } } } } } } },
  });
  if (!quiz) return status("not_found");
  const subjects = new Map<string, PaymentSubject>();
  if (quiz.subject) subjects.set(quiz.subject.id, quiz.subject);
  for (const row of quiz.questions) {
    const subject = row.question.chapter.subject;
    subjects.set(subject.id, subject);
  }
  if (subjects.size === 0) return status(quiz.accessType === "free" || quiz.isFreePreview ? "free" : "missing_context");
  if (subjects.size > 1) {
    // Never decide a paid quiz's owner from the first question or an unrelated subjectId.
    return status(Array.from(subjects.values()).some(isPaymentSubject) ? "missing_context" : "out_of_scope");
  }
  return read(subjects.values().next().value!, quiz.accessType, quiz.isFreePreview);
}

export async function checkQuizAccess(input: { quizId: string; guestSessionToken?: string | null }) {
  return quizAccess(input.quizId, accessReader(input.guestSessionToken));
}

export async function getQuizAccessMap(quizIds: string[], guestSessionToken?: string | null): Promise<Record<string, AccessStatus>> {
  const read = accessReader(guestSessionToken);
  return Object.fromEntries(await Promise.all(Array.from(new Set(quizIds)).map(async (id) => [id, await quizAccess(id, read)])));
}

export async function getStudySummaryAccessMap(input: { summaryIds: string[]; guestSessionToken?: string | null }): Promise<Record<string, StudySummaryAccessStatus>> {
  const ids = Array.from(new Set(input.summaryIds.map((id) => id.trim()).filter(Boolean)));
  if (!ids.length) return {};
  const rows = await prisma.studySummary.findMany({
    where: { id: { in: ids }, status: "published", publishedAt: { lte: new Date() }, subject: publishedSubjectWhere(),
      OR: [{ chapterId: null }, { chapter: { isActive: true, subject: publishedSubjectWhere() } }] },
    select: { id: true, accessType: true, subject: { select: paymentSubjectSelect }, chapter: { select: { subjectId: true } } },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const read = accessReader(input.guestSessionToken);
  return Object.fromEntries(await Promise.all(ids.map(async (id) => {
    const row = byId.get(id);
    const valid = row && (!row.chapter || row.chapter.subjectId === row.subject.id);
    const access = valid ? await read(row.subject, row.accessType) : status("not_found");
    return [id, { ...access, summaryId: id, accessType: valid ? row.accessType : null,
      effectiveAccessType: valid ? (access.allowed && access.reason !== "entitled" ? "free" : "paid") : null }];
  })));
}

export async function checkStudySummaryAccess(input: { summaryId: string; guestSessionToken?: string | null }): Promise<StudySummaryAccessStatus> {
  return (await getStudySummaryAccessMap({ summaryIds: [input.summaryId], guestSessionToken: input.guestSessionToken }))[input.summaryId];
}
