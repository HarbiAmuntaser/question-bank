import { Prisma, type AccessScopeType, type ContactMethod, type QuizAccessType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hashSubscriptionCode, normalizeSubscriptionCode } from "@/lib/server/subscription-code";

type AccessReason =
  | "free"
  | "free_preview"
  | "no_paid_plan"
  | "entitled"
  | "paid_access_required"
  | "missing_context"
  | "not_found";

type LitePlan = {
  id: string;
  scopeType: AccessScopeType;
  title: string;
  description: string | null;
  price: string | null;
  currency: string | null;
  whatsappNumber: string | null;
  telegramUsername: string | null;
  contactMessage: string | null;
  majorId: string | null;
  subjectId: string | null;
};

type AccessStatus = {
  allowed: boolean;
  requiresSubscription: boolean;
  reason: AccessReason;
  scopeType: AccessScopeType | null;
  majorId: string | null;
  subjectId: string | null;
  plan: LitePlan | null;
  entitlementId: string | null;
};

type QuizContext = {
  quizId: string;
  accessType: QuizAccessType;
  isFreePreview: boolean;
  subjectId: string | null;
  majorId: string | null;
};

export class RedeemCodeError extends Error {
  constructor(
    public code:
      | "invalid_code"
      | "inactive_code"
      | "code_not_started"
      | "code_expired"
      | "code_used"
      | "inactive_plan"
      | "invalid_plan_scope",
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function nowActiveWhere(now: Date) {
  return {
    isActive: true,
    startsAt: { lte: now },
    AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
  } satisfies Prisma.AccessEntitlementWhereInput;
}

function serializePlan(plan: {
  id: string;
  scopeType: AccessScopeType;
  title: string;
  description: string | null;
  price: Prisma.Decimal | null;
  currency: string | null;
  whatsappNumber: string | null;
  telegramUsername: string | null;
  contactMessage: string | null;
  majorId: string | null;
  subjectId: string | null;
}): LitePlan {
  return {
    id: plan.id,
    scopeType: plan.scopeType,
    title: plan.title,
    description: plan.description,
    price: plan.price ? plan.price.toString() : null,
    currency: plan.currency,
    whatsappNumber: plan.whatsappNumber,
    telegramUsername: plan.telegramUsername,
    contactMessage: plan.contactMessage,
    majorId: plan.majorId,
    subjectId: plan.subjectId,
  };
}

async function activePlanForScope(scopeType: AccessScopeType, scopeId: string) {
  return prisma.paidAccessPlan.findFirst({
    where: {
      isActive: true,
      scopeType,
      ...(scopeType === "subject" ? { subjectId: scopeId } : { majorId: scopeId }),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      scopeType: true,
      title: true,
      description: true,
      price: true,
      currency: true,
      whatsappNumber: true,
      telegramUsername: true,
      contactMessage: true,
      majorId: true,
      subjectId: true,
    },
  });
}

async function findEntitlement(input: {
  anonymousSessionId?: string | null;
  subjectId?: string | null;
  majorId?: string | null;
}) {
  if (!input.anonymousSessionId) return null;
  const now = new Date();
  const scopeOr: Prisma.AccessEntitlementWhereInput[] = [];

  if (input.subjectId) {
    scopeOr.push({ scopeType: "subject", subjectId: input.subjectId });
  }
  if (input.majorId) {
    scopeOr.push({ scopeType: "major", majorId: input.majorId });
  }
  if (!scopeOr.length) return null;

  return prisma.accessEntitlement.findFirst({
    where: {
      anonymousSessionId: input.anonymousSessionId,
      ...nowActiveWhere(now),
      OR: scopeOr,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
}

async function resolveQuizContext(quizId: string): Promise<QuizContext | null> {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, isActive: true },
    select: {
      id: true,
      accessType: true,
      isFreePreview: true,
      subject: { select: { id: true, majorId: true } },
      questions: {
        take: 1,
        orderBy: { questionOrder: "asc" },
        select: {
          question: {
            select: {
              chapter: {
                select: {
                  subject: { select: { id: true, majorId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!quiz) return null;

  const subject = quiz.subject ?? quiz.questions[0]?.question?.chapter?.subject ?? null;

  return {
    quizId: quiz.id,
    accessType: quiz.accessType,
    isFreePreview: quiz.isFreePreview,
    subjectId: subject?.id ?? null,
    majorId: subject?.majorId ?? null,
  };
}

export async function checkScopeAccess(input: {
  anonymousSessionId?: string | null;
  subjectId?: string | null;
  majorId?: string | null;
}): Promise<AccessStatus> {
  const resolvedMajorId =
    input.majorId ??
    (input.subjectId
      ? (
          await prisma.subject.findUnique({
            where: { id: input.subjectId },
            select: { majorId: true },
          })
        )?.majorId ?? null
      : null);

  if (input.subjectId) {
    const subjectPlan = await activePlanForScope("subject", input.subjectId);
    if (subjectPlan) {
      const entitlement = await findEntitlement({ ...input, majorId: resolvedMajorId });
      return {
        allowed: Boolean(entitlement),
        requiresSubscription: !entitlement,
        reason: entitlement ? "entitled" : "paid_access_required",
        scopeType: "subject",
        majorId: resolvedMajorId ?? subjectPlan.majorId,
        subjectId: input.subjectId,
        plan: serializePlan(subjectPlan),
        entitlementId: entitlement?.id ?? null,
      };
    }
  }

  if (resolvedMajorId) {
    const majorPlan = await activePlanForScope("major", resolvedMajorId);
    if (majorPlan) {
      const entitlement = await findEntitlement({ anonymousSessionId: input.anonymousSessionId, majorId: resolvedMajorId });
      return {
        allowed: Boolean(entitlement),
        requiresSubscription: !entitlement,
        reason: entitlement ? "entitled" : "paid_access_required",
        scopeType: "major",
        majorId: resolvedMajorId,
        subjectId: input.subjectId ?? null,
        plan: serializePlan(majorPlan),
        entitlementId: entitlement?.id ?? null,
      };
    }
  }

  return {
    allowed: true,
    requiresSubscription: false,
    reason: "no_paid_plan",
    scopeType: null,
    majorId: resolvedMajorId,
    subjectId: input.subjectId ?? null,
    plan: null,
    entitlementId: null,
  };
}

export async function checkQuizAccess(input: {
  quizId: string;
  anonymousSessionId?: string | null;
}): Promise<AccessStatus> {
  const context = await resolveQuizContext(input.quizId);

  if (!context) {
    return {
      allowed: false,
      requiresSubscription: false,
      reason: "not_found",
      scopeType: null,
      majorId: null,
      subjectId: null,
      plan: null,
      entitlementId: null,
    };
  }

  if (context.accessType === "free") {
    return {
      allowed: true,
      requiresSubscription: false,
      reason: "free",
      scopeType: null,
      majorId: context.majorId,
      subjectId: context.subjectId,
      plan: null,
      entitlementId: null,
    };
  }

  if (context.isFreePreview) {
    return {
      allowed: true,
      requiresSubscription: false,
      reason: "free_preview",
      scopeType: null,
      majorId: context.majorId,
      subjectId: context.subjectId,
      plan: null,
      entitlementId: null,
    };
  }

  if (context.accessType === "paid" && !context.subjectId && !context.majorId) {
    return {
      allowed: false,
      requiresSubscription: true,
      reason: "missing_context",
      scopeType: null,
      majorId: null,
      subjectId: null,
      plan: null,
      entitlementId: null,
    };
  }

  if (context.accessType === "paid") {
    const entitlement = await findEntitlement({
      anonymousSessionId: input.anonymousSessionId,
      subjectId: context.subjectId,
      majorId: context.majorId,
    });
    const subjectPlan = context.subjectId ? await activePlanForScope("subject", context.subjectId) : null;
    const majorPlan = !subjectPlan && context.majorId ? await activePlanForScope("major", context.majorId) : null;
    const plan = subjectPlan ?? majorPlan;

    return {
      allowed: Boolean(entitlement),
      requiresSubscription: !entitlement,
      reason: entitlement ? "entitled" : "paid_access_required",
      scopeType: context.subjectId ? "subject" : context.majorId ? "major" : null,
      majorId: context.majorId,
      subjectId: context.subjectId,
      plan: plan ? serializePlan(plan) : null,
      entitlementId: entitlement?.id ?? null,
    };
  }

  return checkScopeAccess({
    anonymousSessionId: input.anonymousSessionId,
    subjectId: context.subjectId,
    majorId: context.majorId,
  });
}

function validateCodeWindow(code: {
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  usedCount: number;
  maxUses: number;
  plan: { isActive: boolean; scopeType: AccessScopeType; majorId: string | null; subjectId: string | null };
}) {
  const now = new Date();
  if (!code.isActive) throw new RedeemCodeError("inactive_code", "code_inactive");
  if (code.startsAt && code.startsAt > now) throw new RedeemCodeError("code_not_started", "code_not_started");
  if (code.expiresAt && code.expiresAt <= now) throw new RedeemCodeError("code_expired", "code_expired");
  if (code.usedCount >= code.maxUses) throw new RedeemCodeError("code_used", "code_max_uses_reached");
  if (!code.plan.isActive) throw new RedeemCodeError("inactive_plan", "plan_inactive");
  if (code.plan.scopeType === "major" && !code.plan.majorId) {
    throw new RedeemCodeError("invalid_plan_scope", "missing_major_scope");
  }
  if (code.plan.scopeType === "subject" && !code.plan.subjectId) {
    throw new RedeemCodeError("invalid_plan_scope", "missing_subject_scope");
  }
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function redeemSubscriptionCode(input: {
  code: string;
  anonymousSessionId: string;
}) {
  const normalized = normalizeSubscriptionCode(input.code);
  if (!normalized) throw new RedeemCodeError("invalid_code", "invalid_code");

  const codeHash = hashSubscriptionCode(normalized);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const code = await tx.subscriptionCode.findUnique({
      where: { codeHash },
      include: {
        plan: {
          select: {
            id: true,
            scopeType: true,
            title: true,
            description: true,
            price: true,
            currency: true,
            isActive: true,
            whatsappNumber: true,
            telegramUsername: true,
            contactMessage: true,
            defaultDurationDays: true,
            majorId: true,
            subjectId: true,
          },
        },
      },
    });

    if (!code) throw new RedeemCodeError("invalid_code", "invalid_code");

    const existing = await tx.accessEntitlement.findFirst({
      where: {
        anonymousSessionId: input.anonymousSessionId,
        codeId: code.id,
        ...nowActiveWhere(now),
      },
      select: {
        id: true,
        scopeType: true,
        majorId: true,
        subjectId: true,
        startsAt: true,
        expiresAt: true,
        isActive: true,
      },
    });

    if (existing) {
      return {
        alreadyRedeemed: true,
        entitlement: existing,
        plan: serializePlan(code.plan),
        codePreview: code.codePreview,
      };
    }

    validateCodeWindow(code);

    const increment = await tx.subscriptionCode.updateMany({
      where: {
        id: code.id,
        isActive: true,
        usedCount: { lt: code.maxUses },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      data: { usedCount: { increment: 1 } },
    });

    if (increment.count !== 1) {
      throw new RedeemCodeError("code_used", "code_unavailable");
    }

    const durationDays = code.durationDays ?? code.plan.defaultDurationDays;
    const entitlement = await tx.accessEntitlement.create({
      data: {
        anonymousSessionId: input.anonymousSessionId,
        codeId: code.id,
        scopeType: code.plan.scopeType,
        majorId: code.plan.scopeType === "major" ? code.plan.majorId : null,
        subjectId: code.plan.scopeType === "subject" ? code.plan.subjectId : null,
        startsAt: now,
        expiresAt: durationDays && durationDays > 0 ? addDays(now, durationDays) : null,
        isActive: true,
      },
      select: {
        id: true,
        scopeType: true,
        majorId: true,
        subjectId: true,
        startsAt: true,
        expiresAt: true,
        isActive: true,
      },
    });

    return {
      alreadyRedeemed: false,
      entitlement,
      plan: serializePlan(code.plan),
      codePreview: code.codePreview,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createManualPaymentRequest(input: {
  anonymousSessionId: string;
  planId: string;
  contactMethod?: ContactMethod | null;
  contactValue?: string | null;
  message?: string | null;
  pageUrl?: string | null;
}) {
  const plan = await prisma.paidAccessPlan.findFirst({
    where: { id: input.planId, isActive: true },
    select: { id: true },
  });

  if (!plan) throw new RedeemCodeError("inactive_plan", "plan_not_found_or_inactive", 404);

  return prisma.manualPaymentRequest.create({
    data: {
      anonymousSessionId: input.anonymousSessionId,
      planId: input.planId,
      contactMethod: input.contactMethod ?? null,
      contactValue: input.contactValue?.trim() || null,
      message: input.message?.trim() || null,
      pageUrl: input.pageUrl?.trim() || null,
      status: "pending",
    },
    select: { id: true, status: true, createdAt: true },
  });
}
