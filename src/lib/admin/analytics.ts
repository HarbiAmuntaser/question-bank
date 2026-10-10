import "server-only"

import type { DifficultyLevel, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import type { AnalyticsData } from "@/types/analytics"

const DEFAULT_DAYS = 30
const MAX_DAYS = 365
const MAX_QUIZ_RESULTS = 100
const TOP_BLOG_POSTS = 5

export function parseAnalyticsDays(raw: string | null | undefined): number {
  const parsed = Number.parseInt(raw ?? `${DEFAULT_DAYS}`, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DAYS
  return Math.min(parsed, MAX_DAYS)
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0
  return typeof value === "number" ? value : value.toNumber()
}

function pickDifficulty(values: DifficultyLevel[]): "easy" | "medium" | "hard" {
  const counts: Record<"easy" | "medium" | "hard", number> = { easy: 0, medium: 0, hard: 0 }
  for (const value of values) counts[value] += 1
  if (counts.hard > counts.medium && counts.hard >= counts.easy) return "hard"
  if (counts.easy > counts.medium && counts.easy >= counts.hard) return "easy"
  return "medium"
}

export async function getAnalyticsData(days: number): Promise<AnalyticsData> {
  const normalizedDays = parseAnalyticsDays(String(days))
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (normalizedDays - 1))

  const [
    studentSessions,
    totalQuizzes,
    totalQuestions,
    totalAnswers,
    totalAttempts,
    completedAttempts,
    averageScoreAggregate,
    quizAttemptGroups,
    blogStatusGroups,
    blogViews,
    publishedInPeriod,
    topBlogPosts,
  ] = await Promise.all([
    prisma.anonymousSession.count({ where: { createdAt: { gte: since } } }),
    prisma.quiz.count({ where: { isActive: true } }),
    prisma.question.count({ where: { isActive: true } }),
    prisma.userAnswer.count({ where: { createdAt: { gte: since } } }),
    prisma.quizAttempt.count({ where: { startedAt: { gte: since } } }),
    prisma.quizAttempt.count({ where: { startedAt: { gte: since }, isCompleted: true } }),
    prisma.quizAttempt.aggregate({
      where: { startedAt: { gte: since }, isCompleted: true, score: { not: null } },
      _avg: { score: true },
    }),
    prisma.quizAttempt.groupBy({
      by: ["quizId"],
      where: { quizId: { not: null }, startedAt: { gte: since } },
      _count: { quizId: true },
      _avg: { score: true, timeSpent: true },
      orderBy: { _count: { quizId: "desc" } },
      take: MAX_QUIZ_RESULTS,
    }),
    prisma.blogPost.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.blogPost.aggregate({ _sum: { viewsCount: true } }),
    prisma.blogPost.count({ where: { status: "published", publishedAt: { gte: since } } }),
    prisma.blogPost.findMany({
      where: { status: "published" },
      orderBy: [{ viewsCount: "desc" }, { publishedAt: "desc" }],
      take: TOP_BLOG_POSTS,
      select: { id: true, title: true, viewsCount: true, publishedAt: true },
    }),
  ])

  const quizIds = quizAttemptGroups
    .map((group) => group.quizId)
    .filter((quizId): quizId is string => typeof quizId === "string")

  const [quizzes, completedGroups] = quizIds.length
    ? await Promise.all([
        prisma.quiz.findMany({
          where: { id: { in: quizIds }, isActive: true },
          select: {
            id: true,
            title: true,
            subject: { select: { id: true, name: true } },
            questions: { select: { question: { select: { difficultyLevel: true } } } },
          },
        }),
        prisma.quizAttempt.groupBy({
          by: ["quizId"],
          where: { quizId: { in: quizIds }, startedAt: { gte: since }, isCompleted: true },
          _count: { quizId: true },
        }),
      ])
    : [[], []]

  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]))
  const completedMap = new Map(completedGroups.map((group) => [group.quizId, group._count.quizId]))

  const quizPerformance = quizAttemptGroups.flatMap((group) => {
    if (!group.quizId) return []
    const quiz = quizMap.get(group.quizId)
    if (!quiz) return []
    const attempts = group._count.quizId
    const completed = completedMap.get(group.quizId) ?? 0
    return [{
      quizId: quiz.id,
      title: quiz.title,
      attempts,
      averageScore: round(decimalToNumber(group._avg.score)),
      averageTime: Math.round(group._avg.timeSpent ?? 0),
      completionRate: attempts > 0 ? round((completed / attempts) * 100) : 0,
      difficulty: pickDifficulty(quiz.questions.map((item) => item.question.difficultyLevel)),
    }]
  })

  const subjectAccumulator = new Map<string, {
    subjectName: string
    totalAttempts: number
    weightedScore: number
  }>()
  for (const quiz of quizPerformance) {
    const subject = quizMap.get(quiz.quizId)?.subject
    if (!subject) continue
    const current = subjectAccumulator.get(subject.id) ?? {
      subjectName: subject.name,
      totalAttempts: 0,
      weightedScore: 0,
    }
    current.totalAttempts += quiz.attempts
    current.weightedScore += quiz.averageScore * quiz.attempts
    subjectAccumulator.set(subject.id, current)
  }

  const subjectPerformance = [...subjectAccumulator.entries()]
    .map(([subjectId, value]) => ({
      subjectId,
      subjectName: value.subjectName,
      totalAttempts: value.totalAttempts,
      averageScore: value.totalAttempts > 0 ? round(value.weightedScore / value.totalAttempts) : 0,
    }))
    .sort((a, b) => b.totalAttempts - a.totalAttempts)

  const postCounts = new Map(blogStatusGroups.map((group) => [group.status, group._count._all]))
  const publishedPosts = postCounts.get("published") ?? 0
  const draftPosts = postCounts.get("draft") ?? 0

  return {
    overview: {
      studentSessions,
      totalQuizzes,
      totalQuestions,
      totalAnswers,
      totalAttempts,
      averageScore: round(decimalToNumber(averageScoreAggregate._avg.score)),
      completionRate: totalAttempts > 0 ? round((completedAttempts / totalAttempts) * 100) : 0,
    },
    quizPerformance,
    subjectPerformance,
    blog: {
      totalPosts: blogStatusGroups.reduce((total, group) => total + group._count._all, 0),
      publishedPosts,
      draftPosts,
      publishedInPeriod,
      totalViews: blogViews._sum.viewsCount ?? 0,
      topPosts: topBlogPosts.map((post) => ({
        ...post,
        publishedAt: post.publishedAt?.toISOString() ?? null,
      })),
    },
  }
}
