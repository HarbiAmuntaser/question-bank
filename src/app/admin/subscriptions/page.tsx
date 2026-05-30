import { Suspense } from "react";

import { SubscriptionsAdmin } from "@/components/admin/subscriptions/subscriptions-admin";
import type { CodeRow, EntitlementRow, PlanRow } from "@/components/admin/subscriptions/types";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function previewToken(token: string) {
  return token.length > 12 ? `${token.slice(0, 6)}...${token.slice(-6)}` : token;
}

async function getSubscriptionAdminData() {
  const [plans, codes, entitlements] = await Promise.all([
    prisma.paidAccessPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        major: {
          select: {
            id: true,
            name: true,
            universityId: true,
            university: { select: { name: true } },
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            majorId: true,
            major: {
              select: {
                name: true,
                universityId: true,
                university: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.subscriptionCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { id: true, title: true, scopeType: true } },
      },
      take: 100,
    }),
    prisma.accessEntitlement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        anonymousSession: { select: { sessionToken: true } },
        code: { select: { codePreview: true } },
        major: { select: { name: true } },
        subject: { select: { name: true } },
      },
      take: 100,
    }),
  ]);

  const planRows: PlanRow[] = plans.map((plan) => ({
    id: plan.id,
    scopeType: plan.scopeType,
    majorId: plan.majorId,
    subjectId: plan.subjectId,
    title: plan.title,
    description: plan.description,
    price: plan.price ? plan.price.toString() : null,
    currency: plan.currency,
    isActive: plan.isActive,
    whatsappNumber: plan.whatsappNumber,
    telegramUsername: plan.telegramUsername,
    contactMessage: plan.contactMessage,
    defaultDurationDays: plan.defaultDurationDays,
    defaultMaxUses: plan.defaultMaxUses,
    createdAt: plan.createdAt.toISOString(),
    major: plan.major
      ? {
          id: plan.major.id,
          name: plan.major.name,
          universityId: plan.major.universityId,
          universityName: plan.major.university?.name ?? null,
        }
      : null,
    subject: plan.subject
      ? {
          id: plan.subject.id,
          name: plan.subject.name,
          majorId: plan.subject.majorId,
          majorName: plan.subject.major?.name ?? null,
          universityId: plan.subject.major?.universityId ?? null,
          universityName: plan.subject.major?.university?.name ?? null,
        }
      : null,
  }));

  const codeRows: CodeRow[] = codes.map((code) => ({
    id: code.id,
    planId: code.planId,
    planTitle: code.plan.title,
    planScopeType: code.plan.scopeType,
    codePreview: code.codePreview,
    durationDays: code.durationDays,
    startsAt: code.startsAt?.toISOString() ?? null,
    expiresAt: code.expiresAt?.toISOString() ?? null,
    maxUses: code.maxUses,
    usedCount: code.usedCount,
    isActive: code.isActive,
    note: code.note,
    createdAt: code.createdAt.toISOString(),
  }));

  const entitlementRows: EntitlementRow[] = entitlements.map((entitlement) => ({
    id: entitlement.id,
    scopeType: entitlement.scopeType,
    majorName: entitlement.major?.name ?? null,
    subjectName: entitlement.subject?.name ?? null,
    sessionPreview: previewToken(entitlement.anonymousSession.sessionToken),
    codePreview: entitlement.code?.codePreview ?? null,
    startsAt: entitlement.startsAt.toISOString(),
    expiresAt: entitlement.expiresAt?.toISOString() ?? null,
    isActive: entitlement.isActive,
    createdAt: entitlement.createdAt.toISOString(),
  }));

  return { plans: planRows, codes: codeRows, entitlements: entitlementRows };
}

export default async function SubscriptionsPage() {
  const data = await getSubscriptionAdminData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الاشتراكات اليدوية</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          إدارة خطط الوصول المدفوعة، أكواد الاشتراك، والتفعيلات المرتبطة بجلسات الطلاب.
        </p>
      </div>

      <Suspense fallback={<TableSkeleton columns={8} rows={8} />}>
        <SubscriptionsAdmin {...data} />
      </Suspense>
    </div>
  );
}
