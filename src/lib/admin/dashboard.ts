import "server-only"

import { unstable_cache } from "next/cache"

import { getAdSenseRuntimeConfig } from "@/lib/adsense/config"
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags"
import { prisma } from "@/lib/prisma"
import { googleAuthConfigured, mailConfig, studentRegistrationEnabled } from "@/lib/server/auth-config"
import {
  paymentCodesEnabled,
  paymentReviewEnabled,
  paymentSalesEnabled,
} from "@/lib/server/payment-scope"
import { getR2StorageConfig } from "@/lib/server/storage/config"
import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config"
import type {
  DashboardActivityItem,
  DashboardData,
  DashboardStats,
  DashboardSystemOverview,
  RuntimeState,
} from "@/types/dashboard"

function toIsoString(date: Date): string {
  return date.toISOString()
}

function buildQuestionSubtitle(subjectName?: string | null, chapterName?: string | null): string {
  if (subjectName && chapterName) return `${subjectName} - ${chapterName}`
  if (chapterName) return chapterName
  if (subjectName) return subjectName
  return "تمت إضافة سؤال جديد"
}

function buildQuestionTitle(questionText: string): string {
  const normalized = questionText.trim()
  return normalized.length <= 90 ? normalized : `${normalized.slice(0, 90)}...`
}

async function buildDashboardStats(): Promise<DashboardStats> {
  const [
    universities,
    colleges,
    majors,
    subjects,
    chapters,
    summaries,
    questions,
    quizzes,
    publishedBlogPosts,
    blogViews,
  ] = await Promise.all([
    prisma.university.count(),
    prisma.college.count(),
    prisma.major.count(),
    prisma.subject.count(),
    prisma.chapter.count(),
    prisma.studySummary.count(),
    prisma.question.count(),
    prisma.quiz.count(),
    prisma.blogPost.count({ where: { status: "published" } }),
    prisma.blogPost.aggregate({ _sum: { viewsCount: true } }),
  ])

  return {
    universities,
    colleges,
    majors,
    subjects,
    chapters,
    summaries,
    questions,
    quizzes,
    publishedBlogPosts,
    blogViews: blogViews._sum.viewsCount ?? 0,
    generatedAt: new Date().toISOString(),
  }
}

let cachedDashboardStats: (() => Promise<DashboardStats>) | null = null

function dashboardStatsCache() {
  cachedDashboardStats ??= unstable_cache(
    buildDashboardStats,
    ["admin-dashboard-stats-v2"],
    {
      revalidate: CACHE_TTL.adminDashboard,
      tags: [CACHE_TAGS.admin.dashboardStats],
    },
  )
  return cachedDashboardStats
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return dashboardStatsCache()()
}

export async function getDashboardRecentActivity(): Promise<DashboardActivityItem[]> {
  const [recentQuizzes, recentQuestions, recentChapters, recentSummaries, recentBlogPosts] = await Promise.all([
    prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, createdAt: true, subject: { select: { name: true } } },
    }),
    prisma.question.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        questionText: true,
        createdAt: true,
        chapter: { select: { name: true, subject: { select: { name: true } } } },
      },
    }),
    prisma.chapter.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, name: true, createdAt: true, subject: { select: { name: true } } },
    }),
    prisma.studySummary.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, createdAt: true, subject: { select: { name: true } } },
    }),
    prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, createdAt: true, status: true },
    }),
  ])

  return [
    ...recentQuizzes.map((quiz) => ({
      id: quiz.id,
      type: "quiz" as const,
      title: "تم إنشاء اختبار جديد",
      subtitle: quiz.subject?.name ? `${quiz.title} - ${quiz.subject.name}` : quiz.title,
      createdAt: toIsoString(quiz.createdAt),
    })),
    ...recentQuestions.map((question) => ({
      id: question.id,
      type: "question" as const,
      title: buildQuestionTitle(question.questionText),
      subtitle: buildQuestionSubtitle(question.chapter.subject.name, question.chapter.name),
      createdAt: toIsoString(question.createdAt),
    })),
    ...recentChapters.map((chapter) => ({
      id: chapter.id,
      type: "chapter" as const,
      title: "تم إنشاء فصل جديد",
      subtitle: chapter.subject?.name ? `${chapter.name} - ${chapter.subject.name}` : chapter.name,
      createdAt: toIsoString(chapter.createdAt),
    })),
    ...recentSummaries.map((summary) => ({
      id: summary.id,
      type: "summary" as const,
      title: "تم إنشاء ملخص جديد",
      subtitle: `${summary.title} - ${summary.subject.name}`,
      createdAt: toIsoString(summary.createdAt),
    })),
    ...recentBlogPosts.map((post) => ({
      id: post.id,
      type: "blog" as const,
      title: "تم إنشاء مقال جديد",
      subtitle: `${post.title} - ${post.status}`,
      createdAt: toIsoString(post.createdAt),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
}

function state(enabled: boolean): RuntimeState {
  return enabled ? "enabled" : "disabled"
}

function safeConfiguration(check: () => unknown): "configured" | "missing_or_invalid" {
  try {
    check()
    return "configured"
  } catch {
    return "missing_or_invalid"
  }
}

function googleState(): RuntimeState {
  if (process.env.GOOGLE_AUTH_ENABLED !== "true") return "disabled"
  return googleAuthConfigured() ? "enabled" : "misconfigured"
}

function telegramState(): RuntimeState {
  const config = getTelegramRuntimeConfig()
  if (!config.requestedEnabled) return "disabled"
  return config.enabled ? "enabled" : "misconfigured"
}

function adsenseState(): RuntimeState {
  const config = getAdSenseRuntimeConfig()
  if (!config.requestedEnabled) return "disabled"
  return config.enabled ? "enabled" : "misconfigured"
}

export async function getDashboardSystemOverview(): Promise<DashboardSystemOverview> {
  const databaseStartedAt = performance.now()
  let database: DashboardSystemOverview["database"]
  try {
    await prisma.$queryRaw`SELECT 1`
    database = { status: "healthy", latencyMs: Math.max(0, Math.round(performance.now() - databaseStartedAt)) }
  } catch {
    database = { status: "unavailable", latencyMs: null }
  }

  const [connectedChannels, jobGroups, lastCompletedJob] = await Promise.all([
    prisma.telegramSubjectChannel.count({ where: { status: "connected", isEnabled: true } }),
    prisma.telegramSyncJob.groupBy({
      by: ["status"],
      where: { status: { in: ["pending", "failed"] } },
      _count: { _all: true },
    }),
    prisma.telegramSyncJob.findFirst({
      where: { status: "completed", completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
  ])
  const jobs = new Map(jobGroups.map((group) => [group.status, group._count._all]))

  return {
    database,
    runtime: {
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null,
    },
    configuration: {
      smtp: safeConfiguration(mailConfig),
      r2: safeConfiguration(getR2StorageConfig),
    },
    releaseControls: {
      payment: state(paymentSalesEnabled()),
      paymentReview: state(paymentReviewEnabled()),
      activationCodes: state(paymentCodesEnabled()),
      studentRegistration: state(studentRegistrationEnabled()),
      googleAuth: googleState(),
      telegram: telegramState(),
      adsense: adsenseState(),
    },
    telegramOperations: {
      connectedChannels,
      pendingJobs: jobs.get("pending") ?? 0,
      failedJobs: jobs.get("failed") ?? 0,
      lastCompletedAt: lastCompletedJob?.completedAt?.toISOString() ?? null,
    },
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const [stats, recentActivity, system] = await Promise.all([
    getDashboardStats(),
    getDashboardRecentActivity(),
    getDashboardSystemOverview(),
  ])
  return { stats, recentActivity, system }
}
