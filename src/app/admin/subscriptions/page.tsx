import { requireAdminPage } from "@/lib/server/admin-page-auth";
import { Suspense } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@prisma/client";

import { SubscriptionsAdmin } from "@/components/admin/subscriptions/subscriptions-admin";
import type {
  CodeRow,
  EntitlementRow,
  PaginationMeta,
  PlanRow,
  StatusFilter,
  SubscriptionFilters,
} from "@/components/admin/subscriptions/types";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { prisma } from "@/lib/prisma";
import { paymentPlanWhere, paymentV1Enabled, paymentSalesEnabled, paymentCodesEnabled, paymentReviewEnabled, paymentLaunchPlanIds } from "@/lib/server/payment-scope";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;
type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function pageParam(params: SearchParams, key: string) {
  const value = Number.parseInt(one(params, key) ?? "", 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 10000) : 1;
}

function statusParam(params: SearchParams, key: string, allowed: StatusFilter[]): StatusFilter {
  const value = one(params, key);
  return value && allowed.includes(value as StatusFilter) ? (value as StatusFilter) : "all";
}

function pagination(page: number, total: number): PaginationMeta {
  return {
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

async function getSubscriptionAdminData(params: SearchParams) {
  const now = new Date();
  const plansPage = pageParam(params, "plansPage");
  const codesPage = pageParam(params, "codesPage");
  const entitlementsPage = pageParam(params, "entitlementsPage");
  const filters: SubscriptionFilters = {
    plansStatus: statusParam(params, "plansStatus", ["all", "active", "disabled"]),
    codesStatus: statusParam(params, "codesStatus", ["all", "active", "disabled"]),
    entitlementsStatus: statusParam(params, "entitlementsStatus", ["all", "active", "disabled", "expired"]),
  };

  const plansWhere: Prisma.PaidAccessPlanWhereInput =
    filters.plansStatus === "active"
      ? { isActive: true }
      : filters.plansStatus === "disabled"
        ? { isActive: false }
        : {};

  const codesWhere: Prisma.SubscriptionCodeWhereInput =
    filters.codesStatus === "active"
      ? { isActive: true }
      : filters.codesStatus === "disabled"
        ? { isActive: false }
        : {};

  const entitlementsWhere: Prisma.AccessEntitlementWhereInput =
    filters.entitlementsStatus === "active"
      ? { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
      : filters.entitlementsStatus === "disabled"
        ? { isActive: false }
        : filters.entitlementsStatus === "expired"
          ? { expiresAt: { lte: now } }
          : {};

  const [plansTotal, codesTotal, entitlementsTotal, plans, codePlanOptions, codes, entitlements, eligiblePlans] = await Promise.all([
    prisma.paidAccessPlan.count({ where: plansWhere }),
    prisma.subscriptionCode.count({ where: codesWhere }),
    prisma.accessEntitlement.count({ where: entitlementsWhere }),
    prisma.paidAccessPlan.findMany({
      where: plansWhere,
      orderBy: { createdAt: "desc" },
      skip: (plansPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
    prisma.paidAccessPlan.findMany({
      where: { isActive: true, ...paymentPlanWhere() },
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
      where: codesWhere,
      orderBy: { createdAt: "desc" },
      skip: (codesPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        plan: { select: { id: true, title: true, scopeType: true } },
      },
    }),
    prisma.accessEntitlement.findMany({
      where: entitlementsWhere,
      orderBy: { createdAt: "desc" },
      skip: (entitlementsPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true } },
        code: { select: { codePreview: true } },
        subject: { select: { name: true } },
      },
    }),
    prisma.paidAccessPlan.findMany({ where: paymentPlanWhere(), select: { id: true } }),
  ]);

  const eligibleIds = new Set(eligiblePlans.map((plan) => plan.id));

  const planRows: PlanRow[] = plans.map((plan) => ({
    paymentEligible: eligibleIds.has(plan.id),
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
    updatedAt: plan.updatedAt.toISOString(),
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

  const codePlanRows: PlanRow[] = codePlanOptions.map((plan) => ({
    paymentEligible: true,
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
    updatedAt: plan.updatedAt.toISOString(),
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
    updatedAt: code.updatedAt.toISOString(),
  }));

  const entitlementRows: EntitlementRow[] = entitlements.map((entitlement) => ({
    id: entitlement.id,
    scopeType: entitlement.scopeType,
    majorName: null,
    subjectName: entitlement.subject?.name ?? null,
    userId: entitlement.userId,
    userEmail: entitlement.user?.email ?? null,
    codePreview: entitlement.code?.codePreview ?? null,
    startsAt: entitlement.startsAt.toISOString(),
    expiresAt: entitlement.expiresAt?.toISOString() ?? null,
    isActive: entitlement.isActive,
    createdAt: entitlement.createdAt.toISOString(),
    updatedAt: entitlement.updatedAt.toISOString(),
  }));

  return {
    paymentsEnabled: paymentV1Enabled(),
    salesEnabled: paymentSalesEnabled(),
    codesEnabled: paymentCodesEnabled(),
    reviewEnabled: paymentReviewEnabled(),
    launchPlanIds: paymentLaunchPlanIds(),
    plans: planRows,
    codePlanOptions: codePlanRows,
    codes: codeRows,
    entitlements: entitlementRows,
    filters,
    plansPagination: pagination(plansPage, plansTotal),
    codesPagination: pagination(codesPage, codesTotal),
    entitlementsPagination: pagination(entitlementsPage, entitlementsTotal),
  };
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage("subscriptions:manage");

  const data = await getSubscriptionAdminData(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الاشتراكات اليدوية</h1>
          <Button asChild variant="outline"><Link href="/admin/subscriptions/audit"><ClipboardList className="ml-2 h-4 w-4" />سجل التدقيق</Link></Button>
        </div>
        <dl className="mt-4 grid gap-3 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted-foreground">المبيعات الجديدة</dt><dd>{data.salesEnabled ? "مفتوحة" : "مغلقة"}</dd></div>
          <div><dt className="text-muted-foreground">مراجعة الطلبات</dt><dd>{data.reviewEnabled ? "متاحة" : "متوقفة"}</dd></div>
          <div><dt className="text-muted-foreground">إصدار وتفعيل الأكواد</dt><dd>{data.codesEnabled ? "متاح" : "متوقف"}</dd></div>
          <div><dt className="text-muted-foreground">خطط قائمة الإطلاق</dt><dd>{data.launchPlanIds.length}</dd></div>
        </dl>
      </div>

      <Suspense fallback={<TableSkeleton columns={8} rows={8} />}>
        <SubscriptionsAdmin {...data} />
      </Suspense>
    </div>
  );
}
