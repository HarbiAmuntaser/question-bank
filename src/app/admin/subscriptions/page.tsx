import type { Prisma } from "@prisma/client"
import Link from "next/link"
import { ClipboardList } from "lucide-react"

import { SubscriptionsAdmin } from "@/components/admin/subscriptions/subscriptions-admin"
import type {
  CodeRow,
  EntitlementRow,
  PaginationMeta,
  PlanRow,
  StatusFilter,
  SubscriptionFilters,
  SubscriptionTab,
  TelegramAdminData,
  TelegramChannelRow,
} from "@/components/admin/subscriptions/types"
import { Button } from "@/components/ui/button"
import {
  paymentPlanPathWhere,
  paymentSubjectPathWhere,
  readPaymentPathFilters,
  type PaymentPathFilters,
} from "@/lib/admin/payment-admin-filters"
import { prisma } from "@/lib/prisma"
import { requireAdminPage } from "@/lib/server/admin-page-auth"
import {
  paymentCodesEnabled,
  paymentLaunchPlanIds,
  paymentPlanWhere,
  paymentReviewEnabled,
  paymentSalesEnabled,
  paymentV1Enabled,
} from "@/lib/server/payment-scope"
import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 10
type SearchParams = Record<string, string | string[] | undefined>

const planInclude = {
  major: {
    select: {
      id: true,
      name: true,
      collegeId: true,
      universityId: true,
      college: { select: { name: true } },
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
          collegeId: true,
          universityId: true,
          college: { select: { name: true } },
          university: { select: { name: true } },
        },
      },
    },
  },
} satisfies Prisma.PaidAccessPlanInclude

type PlanRecord = Prisma.PaidAccessPlanGetPayload<{ include: typeof planInclude }>

function one(params: SearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function activeTab(params: SearchParams): SubscriptionTab {
  const tab = one(params, "tab")
  return tab === "codes" || tab === "entitlements" || tab === "telegram" ? tab : "plans"
}

function pageParam(params: SearchParams, key: string) {
  const value = Number.parseInt(one(params, key) ?? "", 10)
  return Number.isFinite(value) && value > 0 ? Math.min(value, 10_000) : 1
}

function statusParam(params: SearchParams, key: string, allowed: StatusFilter[]): StatusFilter {
  const value = one(params, key)
  return value && allowed.includes(value as StatusFilter) ? (value as StatusFilter) : "all"
}

function pagination(page: number, total: number): PaginationMeta {
  return { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

function serializePlan(plan: PlanRecord, paymentEligible: boolean): PlanRow {
  return {
    paymentEligible,
    id: plan.id,
    scopeType: plan.scopeType,
    majorId: plan.majorId,
    subjectId: plan.subjectId,
    title: plan.title,
    description: plan.description,
    price: plan.price?.toString() ?? null,
    currency: plan.currency,
    isActive: plan.isActive,
    activationCodesEnabled: plan.activationCodesEnabled,
    whatsappNumber: plan.whatsappNumber,
    telegramUsername: plan.telegramUsername,
    contactMessage: plan.contactMessage,
    defaultDurationDays: plan.defaultDurationDays,
    defaultMaxUses: plan.defaultMaxUses,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    major: plan.major ? {
      id: plan.major.id,
      name: plan.major.name,
      collegeId: plan.major.collegeId,
      collegeName: plan.major.college?.name ?? null,
      universityId: plan.major.universityId,
      universityName: plan.major.university?.name ?? null,
    } : null,
    subject: plan.subject ? {
      id: plan.subject.id,
      name: plan.subject.name,
      majorId: plan.subject.majorId,
      majorName: plan.subject.major?.name ?? null,
      collegeId: plan.subject.major?.collegeId ?? null,
      collegeName: plan.subject.major?.college?.name ?? null,
      universityId: plan.subject.major?.universityId ?? null,
      universityName: plan.subject.major?.university?.name ?? null,
    } : null,
  }
}

async function getPlansData(params: SearchParams, path: PaymentPathFilters) {
  const page = pageParam(params, "plansPage")
  const status = statusParam(params, "plansStatus", ["all", "active", "disabled"])
  const where: Prisma.PaidAccessPlanWhereInput = {
    AND: [
      paymentPlanPathWhere(path),
      status === "active" ? { isActive: true } : status === "disabled" ? { isActive: false } : {},
    ],
  }
  const [total, rows] = await Promise.all([
    prisma.paidAccessPlan.count({ where }),
    prisma.paidAccessPlan.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: planInclude,
    }),
  ])
  const eligible = rows.length ? await prisma.paidAccessPlan.findMany({
    where: { id: { in: rows.map((row) => row.id) }, ...paymentPlanWhere() },
    select: { id: true },
  }) : []
  const eligibleIds = new Set(eligible.map((row) => row.id))
  return { rows: rows.map((row) => serializePlan(row, eligibleIds.has(row.id))), status, pagination: pagination(page, total) }
}

async function getCodesData(params: SearchParams, path: PaymentPathFilters) {
  const page = pageParam(params, "codesPage")
  const status = statusParam(params, "codesStatus", ["all", "active", "disabled"])
  const codesQuery = (one(params, "codesQuery") ?? "").trim().slice(0, 100)
  const where: Prisma.SubscriptionCodeWhereInput = {
    AND: [
      { plan: paymentPlanPathWhere(path) },
      status === "active" ? { isActive: true } : status === "disabled" ? { isActive: false } : {},
      codesQuery ? { OR: [
        { supportReference: { contains: codesQuery, mode: "insensitive" } },
        { codePreview: { contains: codesQuery, mode: "insensitive" } },
      ] } : {},
    ],
  }
  const [total, rows] = await Promise.all([
    prisma.subscriptionCode.count({ where }),
    prisma.subscriptionCode.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        plan: { select: {
          id: true,
          title: true,
          scopeType: true,
          subjectId: true,
          subject: { select: {
            name: true,
            major: { select: {
              name: true,
              college: { select: { name: true } },
              university: { select: { name: true } },
            } },
          } },
        } },
        accessGrant: { select: {
          id: true,
          principalType: true,
          userId: true,
          startsAt: true,
          expiresAt: true,
          isActive: true,
          revokedAt: true,
          user: { select: { email: true } },
        } },
      },
    }),
  ])
  const grantIds = rows.flatMap((row) => row.accessGrant ? [row.accessGrant.id] : [])
  const [allSessions, activeSessions] = grantIds.length ? await Promise.all([
    prisma.codeAccessSessionBinding.groupBy({
      by: ["grantId"],
      where: { grantId: { in: grantIds } },
      _count: { _all: true },
    }),
    prisma.codeAccessSessionBinding.groupBy({
      by: ["grantId"],
      where: { grantId: { in: grantIds }, revokedAt: null },
      _count: { _all: true },
    }),
  ]) : [[], []]
  const totalSessionMap = new Map(allSessions.map((item) => [item.grantId, item._count._all]))
  const activeSessionMap = new Map(activeSessions.map((item) => [item.grantId, item._count._all]))

  const codeRows: CodeRow[] = rows.map((code) => ({
    id: code.id,
    planId: code.planId,
    planTitle: code.plan.title,
    planScopeType: code.plan.scopeType,
    subjectId: code.plan.subjectId,
    subjectName: code.plan.subject?.name ?? null,
    majorName: code.plan.subject?.major.name ?? null,
    collegeName: code.plan.subject?.major.college?.name ?? null,
    universityName: code.plan.subject?.major.university.name ?? null,
    codePreview: code.codePreview,
    supportReference: code.supportReference,
    maxBrowserSessions: code.maxBrowserSessions,
    durationDays: code.durationDays,
    startsAt: code.startsAt?.toISOString() ?? null,
    expiresAt: code.expiresAt?.toISOString() ?? null,
    maxUses: code.maxUses,
    usedCount: code.usedCount,
    isActive: code.isActive,
    note: code.note,
    createdAt: code.createdAt.toISOString(),
    updatedAt: code.updatedAt.toISOString(),
    accessGrant: code.accessGrant ? {
      id: code.accessGrant.id,
      principalType: code.accessGrant.principalType,
      userId: code.accessGrant.userId,
      userEmail: code.accessGrant.user?.email ?? null,
      startsAt: code.accessGrant.startsAt.toISOString(),
      expiresAt: code.accessGrant.expiresAt.toISOString(),
      isActive: code.accessGrant.isActive,
      revokedAt: code.accessGrant.revokedAt?.toISOString() ?? null,
      activeSessions: activeSessionMap.get(code.accessGrant.id) ?? 0,
      totalSessions: totalSessionMap.get(code.accessGrant.id) ?? 0,
    } : null,
  }))
  return { rows: codeRows, status, query: codesQuery, pagination: pagination(page, total) }
}

async function getEntitlementsData(params: SearchParams, path: PaymentPathFilters) {
  const now = new Date()
  const page = pageParam(params, "entitlementsPage")
  const status = statusParam(params, "entitlementsStatus", ["all", "active", "disabled", "expired"])
  const where: Prisma.AccessEntitlementWhereInput = {
    AND: [
      { subject: paymentSubjectPathWhere(path) },
      status === "active" ? { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
        : status === "disabled" ? { isActive: false }
          : status === "expired" ? { expiresAt: { lte: now } }
            : {},
    ],
  }
  const [total, rows] = await Promise.all([
    prisma.accessEntitlement.count({ where }),
    prisma.accessEntitlement.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { email: true } },
        code: { select: { codePreview: true } },
        subject: { select: {
          name: true,
          major: { select: {
            name: true,
            college: { select: { name: true } },
            university: { select: { name: true } },
          } },
        } },
      },
    }),
  ])
  const entitlementRows: EntitlementRow[] = rows.map((item) => ({
    id: item.id,
    scopeType: item.scopeType,
    subjectName: item.subject.name,
    majorName: item.subject.major.name,
    collegeName: item.subject.major.college?.name ?? null,
    universityName: item.subject.major.university.name,
    userId: item.userId,
    userEmail: item.user.email,
    codePreview: item.code?.codePreview ?? null,
    startsAt: item.startsAt.toISOString(),
    expiresAt: item.expiresAt?.toISOString() ?? null,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }))
  return { rows: entitlementRows, status, pagination: pagination(page, total) }
}

async function getTelegramAdminData(params: SearchParams, path: PaymentPathFilters, activeTab: boolean): Promise<TelegramAdminData> {
  const runtime = getTelegramRuntimeConfig()
  const query = (one(params, "telegramQuery") ?? "").trim().slice(0, 100)
  const rawStatus = one(params, "telegramStatus") ?? "all"
  const allowedStatuses = ["all", "enabled", "disabled", "connected", "degraded", "disconnected"] as const
  const status = allowedStatuses.includes(rawStatus as (typeof allowedStatuses)[number])
    ? rawStatus as (typeof allowedStatuses)[number]
    : "all"
  const page = pageParam(params, "telegramPage")
  if (!activeTab) return {
    runtimeEnabled: runtime.enabled,
    runtimeReason: runtime.reason,
    query,
    status,
    channels: [],
    pagination: pagination(1, 0),
  }

  const where: Prisma.TelegramSubjectChannelWhereInput = {
    subject: paymentSubjectPathWhere(path),
    ...(status === "enabled" ? { isEnabled: true } : {}),
    ...(status === "disabled" ? { isEnabled: false } : {}),
    ...(["connected", "degraded", "disconnected"].includes(status) ? {
      status: status as "connected" | "degraded" | "disconnected",
    } : {}),
    ...(query ? { OR: [
      { title: { contains: query, mode: "insensitive" } },
      { telegramChatId: { contains: query } },
      { subject: { name: { contains: query, mode: "insensitive" } } },
      { subject: { major: { name: { contains: query, mode: "insensitive" } } } },
      { subject: { major: { college: { name: { contains: query, mode: "insensitive" } } } } },
      { subject: { major: { university: { name: { contains: query, mode: "insensitive" } } } } },
    ] } : {}),
  }
  const [total, channels] = await Promise.all([
    prisma.telegramSubjectChannel.count({ where }),
    prisma.telegramSubjectChannel.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { subject: { select: {
        id: true,
        name: true,
        major: { select: {
          name: true,
          college: { select: { name: true } },
          university: { select: { name: true } },
        } },
      } } },
    }),
  ])
  const channelIds = channels.map((channel) => channel.id)
  const [membershipGroups, jobGroups] = channelIds.length ? await Promise.all([
    prisma.telegramMembership.groupBy({
      by: ["channelId", "status"],
      where: { channelId: { in: channelIds } },
      _count: { _all: true },
    }),
    prisma.telegramSyncJob.groupBy({
      by: ["channelId"],
      where: { channelId: { in: channelIds }, status: { in: ["pending", "processing", "failed"] } },
      _count: { _all: true },
    }),
  ]) : [[], []]
  const membershipMap = new Map<string, { total: number; active: number; attention: number }>()
  for (const group of membershipGroups) {
    const value = membershipMap.get(group.channelId) ?? { total: 0, active: 0, attention: 0 }
    value.total += group._count._all
    if (group.status === "active") value.active += group._count._all
    if (group.status === "error" || group.status === "removal_pending") value.attention += group._count._all
    membershipMap.set(group.channelId, value)
  }
  const jobsMap = new Map(jobGroups.map((group) => [group.channelId, group._count._all]))
  const rows: TelegramChannelRow[] = channels.map((channel) => ({
    id: channel.id,
    subjectId: channel.subjectId,
    subjectName: channel.subject.name,
    majorName: channel.subject.major.name,
    collegeName: channel.subject.major.college?.name ?? null,
    universityName: channel.subject.major.university.name,
    title: channel.title,
    status: channel.status,
    isEnabled: channel.isEnabled,
    botCanInviteUsers: channel.botCanInviteUsers,
    botCanRestrictMembers: channel.botCanRestrictMembers,
    verifiedAt: channel.verifiedAt?.toISOString() ?? null,
    lastHealthCheckedAt: channel.lastHealthCheckedAt?.toISOString() ?? null,
    updatedAt: channel.updatedAt.toISOString(),
    memberships: membershipMap.get(channel.id) ?? { total: 0, active: 0, attention: 0 },
    pendingJobs: jobsMap.get(channel.id) ?? 0,
  }))
  return {
    runtimeEnabled: runtime.enabled,
    runtimeReason: runtime.reason,
    query,
    status,
    channels: rows,
    pagination: pagination(page, total),
  }
}

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("subscriptions:manage")
  const params = await searchParams
  const tab = activeTab(params)
  const path = readPaymentPathFilters(params)
  const filters: SubscriptionFilters = {
    plansStatus: statusParam(params, "plansStatus", ["all", "active", "disabled"]),
    codesStatus: statusParam(params, "codesStatus", ["all", "active", "disabled"]),
    entitlementsStatus: statusParam(params, "entitlementsStatus", ["all", "active", "disabled", "expired"]),
  }
  const empty = pagination(1, 0)

  const [plansData, codesData, entitlementsData, telegram, codeEligiblePlanCount] = await Promise.all([
    tab === "plans" ? getPlansData(params, path) : null,
    tab === "codes" ? getCodesData(params, path) : null,
    tab === "entitlements" ? getEntitlementsData(params, path) : null,
    getTelegramAdminData(params, path, tab === "telegram"),
    prisma.paidAccessPlan.count({ where: { activationCodesEnabled: true, isActive: true, ...paymentPlanWhere() } }),
  ])

  const controls = {
    paymentsEnabled: paymentV1Enabled(),
    salesEnabled: paymentSalesEnabled(),
    codesEnabled: paymentCodesEnabled(),
    reviewEnabled: paymentReviewEnabled(),
    launchPlanIds: paymentLaunchPlanIds(),
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">الاشتراكات اليدوية</h1>
          <Button asChild variant="outline"><Link href="/admin/subscriptions/audit"><ClipboardList className="ml-2 h-4 w-4" />سجل التدقيق</Link></Button>
        </div>
        <dl className="mt-4 grid gap-3 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted-foreground">المبيعات الجديدة</dt><dd>{controls.salesEnabled ? "مفتوحة" : "مغلقة"}</dd></div>
          <div><dt className="text-muted-foreground">مراجعة الطلبات</dt><dd>{controls.reviewEnabled ? "متاحة" : "متوقفة"}</dd></div>
          <div><dt className="text-muted-foreground">إصدار وتفعيل الأكواد</dt><dd>{controls.codesEnabled ? "متاح" : "متوقف"}</dd></div>
          <div><dt className="text-muted-foreground">خطط الإطلاق / المؤهلة للأكواد</dt><dd>{controls.launchPlanIds.length} / {codeEligiblePlanCount}</dd></div>
        </dl>
      </div>

      <SubscriptionsAdmin
        activeTab={tab}
        paymentsEnabled={controls.paymentsEnabled}
        codesEnabled={controls.codesEnabled}
        launchPlanIds={controls.launchPlanIds}
        codesQuery={codesData?.query ?? ""}
        plans={plansData?.rows ?? []}
        codes={codesData?.rows ?? []}
        entitlements={entitlementsData?.rows ?? []}
        filters={filters}
        plansPagination={plansData?.pagination ?? empty}
        codesPagination={codesData?.pagination ?? empty}
        entitlementsPagination={entitlementsData?.pagination ?? empty}
        telegram={telegram}
      />
    </div>
  )
}
