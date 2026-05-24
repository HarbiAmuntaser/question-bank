import { unstable_cache } from "next/cache"
import type { DifficultyLevel, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { AnalyticsData } from "@/types/analytics"

export const ANALYTICS_REVALIDATE_SECONDS = 300

const DEFAULT_DAYS = 30
const MAX_DAYS = 365
const TOP_QUESTIONS_LIMIT = 25

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Aden",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

function toDateKey(date: Date): string {
  const parts = dateFormatter.formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "00"
  const day = parts.find((part) => part.type === "day")?.value ?? "00"
  return `${year}-${month}-${day}`
}

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
  const counts: Record<"easy" | "medium" | "hard", number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  }

  for (const value of values) {
    counts[value] += 1
  }

  if (counts.hard > counts.medium && counts.hard >= counts.easy) return "hard"
  if (counts.easy > counts.medium && counts.easy >= counts.hard) return "easy"
  return "medium"
}

function buildEmptySeries(days: number): Map<string, { attempts: number; scoreSum: number; scoreCount: number; newUsers: number }> {
  const series = new Map<string, { attempts: number; scoreSum: number; scoreCount: number; newUsers: number }>()
  const now = new Date()

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - offset)
    series.set(toDateKey(date), {
      attempts: 0,
      scoreSum: 0,
      scoreCount: 0,
      newUsers: 0,
    })
  }

  return series
}

type DifficultyAccumulator = Record<
  "easy" | "medium" | "hard",
  { count: number; totalAnswers: number; correctAnswers: number }
>

async function buildAnalyticsData(days: number): Promise<AnalyticsData> {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const [
    totalUsers,
    totalQuizzes,
    totalQuestions,
    totalAttempts,
    completedAttempts,
    averageScoreAggregate,
    quizzes,
    quizAttemptGroups,
    quizCompletedGroups,
    subjects,
    questionMeta,
    questionAnswerGroups,
    questionCorrectGroups,
    recentAttempts,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.quiz.count({ where: { isActive: true } }),
    prisma.question.count({ where: { isActive: true } }),
    prisma.quizAttempt.count(),
    prisma.quizAttempt.count({ where: { isCompleted: true } }),
    prisma.quizAttempt.aggregate({
      where: { isCompleted: true, score: { not: null } },
      _avg: { score: true },
    }),
    prisma.quiz.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        subjectId: true,
        questions: {
          select: {
            question: {
              select: {
                difficultyLevel: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.quizAttempt.groupBy({
      by: ["quizId"],
      where: { quizId: { not: null } },
      _count: { quizId: true },
      _avg: { score: true, timeSpent: true },
    }),
    prisma.quizAttempt.groupBy({
      by: ["quizId"],
      where: { quizId: { not: null }, isCompleted: true },
      _count: { quizId: true },
    }),
    prisma.subject.findMany({
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.question.findMany({
      where: { isActive: true },
      select: {
        id: true,
        difficultyLevel: true,
        chapter: {
          select: {
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.userAnswer.groupBy({
      by: ["questionId"],
      _count: { questionId: true },
      _avg: { timeSpent: true },
    }),
    prisma.userAnswer.groupBy({
      by: ["questionId"],
      where: { isCorrect: true },
      _count: { questionId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { startedAt: { gte: since } },
      select: {
        startedAt: true,
        score: true,
      },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since }, isActive: true },
      select: {
        createdAt: true,
      },
    }),
  ])

  const quizAttemptsMap = new Map<string, { attempts: number; averageScore: number; averageTime: number }>()
  const quizCompletedMap = new Map<string, number>()

  for (const group of quizAttemptGroups) {
    if (!group.quizId) continue
    quizAttemptsMap.set(group.quizId, {
      attempts: group._count.quizId,
      averageScore: round(decimalToNumber(group._avg.score)),
      averageTime: Math.round(group._avg.timeSpent ?? 0),
    })
  }

  for (const group of quizCompletedGroups) {
    if (!group.quizId) continue
    quizCompletedMap.set(group.quizId, group._count.quizId)
  }

  const quizPerformance = quizzes
    .map((quiz) => {
      const stats = quizAttemptsMap.get(quiz.id)
      const attempts = stats?.attempts ?? 0
      const completed = quizCompletedMap.get(quiz.id) ?? 0
      const difficulties = quiz.questions.map((item) => item.question.difficultyLevel)

      return {
        quizId: quiz.id,
        title: quiz.title,
        attempts,
        averageScore: stats?.averageScore ?? 0,
        averageTime: stats?.averageTime ?? 0,
        completionRate: attempts > 0 ? round((completed / attempts) * 100) : 0,
        difficulty: pickDifficulty(difficulties),
      }
    })
    .sort((a, b) => {
      if (b.attempts !== a.attempts) return b.attempts - a.attempts
      return b.averageScore - a.averageScore
    })

  const questionAnswerMap = new Map<string, { total: number; averageTime: number }>()
  const questionCorrectMap = new Map<string, number>()

  for (const group of questionAnswerGroups) {
    questionAnswerMap.set(group.questionId, {
      total: group._count.questionId,
      averageTime: group._avg.timeSpent ?? 0,
    })
  }

  for (const group of questionCorrectGroups) {
    questionCorrectMap.set(group.questionId, group._count.questionId)
  }

  const difficultyAccumulator: DifficultyAccumulator = {
    easy: { count: 0, totalAnswers: 0, correctAnswers: 0 },
    medium: { count: 0, totalAnswers: 0, correctAnswers: 0 },
    hard: { count: 0, totalAnswers: 0, correctAnswers: 0 },
  }

  const subjectQuestionCountMap = new Map<string, number>()

  for (const question of questionMeta) {
    const difficulty = question.difficultyLevel
    const answerStats = questionAnswerMap.get(question.id)
    const correctAnswers = questionCorrectMap.get(question.id) ?? 0

    difficultyAccumulator[difficulty].count += 1
    difficultyAccumulator[difficulty].totalAnswers += answerStats?.total ?? 0
    difficultyAccumulator[difficulty].correctAnswers += correctAnswers

    const subjectId = question.chapter.subject.id
    subjectQuestionCountMap.set(subjectId, (subjectQuestionCountMap.get(subjectId) ?? 0) + 1)
  }

  const sortedQuestionIds =
    questionAnswerMap.size > 0
      ? [...questionAnswerMap.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, TOP_QUESTIONS_LIMIT)
          .map(([questionId]) => questionId)
      : questionMeta.slice(0, TOP_QUESTIONS_LIMIT).map((question) => question.id)

  const topQuestions =
    sortedQuestionIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: sortedQuestionIds } },
          select: {
            id: true,
            questionText: true,
            difficultyLevel: true,
            tags: true,
          },
        })
      : []

  const topQuestionMap = new Map(topQuestions.map((question) => [question.id, question]))

  const questionAnalysis = sortedQuestionIds
    .map((questionId) => {
      const question = topQuestionMap.get(questionId)
      if (!question) return null

      const total = questionAnswerMap.get(questionId)?.total ?? 0
      const averageTime = questionAnswerMap.get(questionId)?.averageTime ?? 0
      const correct = questionCorrectMap.get(questionId) ?? 0

      return {
        questionId,
        questionText: question.questionText,
        correctRate: total > 0 ? round((correct / total) * 100) : 0,
        averageTime: Math.round(averageTime),
        difficulty: question.difficultyLevel,
        tags: question.tags,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const series = buildEmptySeries(days)

  for (const attempt of recentAttempts) {
    const key = toDateKey(attempt.startedAt)
    const entry = series.get(key)
    if (!entry) continue

    entry.attempts += 1
    if (attempt.score != null) {
      entry.scoreSum += decimalToNumber(attempt.score)
      entry.scoreCount += 1
    }
  }

  for (const user of recentUsers) {
    const key = toDateKey(user.createdAt)
    const entry = series.get(key)
    if (!entry) continue
    entry.newUsers += 1
  }

  const timeSeriesData = [...series.entries()].map(([date, entry]) => ({
    date,
    attempts: entry.attempts,
    averageScore: entry.scoreCount > 0 ? round(entry.scoreSum / entry.scoreCount) : 0,
    newUsers: entry.newUsers,
  }))

  const subjectScoreAccumulator = new Map<string, { totalAttempts: number; weightedScoreSum: number }>()

  for (const quiz of quizzes) {
    if (!quiz.subjectId) continue

    const quizStats = quizAttemptsMap.get(quiz.id)
    if (!quizStats) continue

    const current = subjectScoreAccumulator.get(quiz.subjectId) ?? {
      totalAttempts: 0,
      weightedScoreSum: 0,
    }

    current.totalAttempts += quizStats.attempts
    current.weightedScoreSum += quizStats.averageScore * quizStats.attempts
    subjectScoreAccumulator.set(quiz.subjectId, current)
  }

  const subjectPerformance = subjects
    .map((subject) => {
      const subjectStats = subjectScoreAccumulator.get(subject.id)
      const totalAttemptsForSubject = subjectStats?.totalAttempts ?? 0
      const weightedScoreSum = subjectStats?.weightedScoreSum ?? 0

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        averageScore: totalAttemptsForSubject > 0 ? round(weightedScoreSum / totalAttemptsForSubject) : 0,
        totalAttempts: totalAttemptsForSubject,
        questionCount: subjectQuestionCountMap.get(subject.id) ?? 0,
      }
    })
    .filter((subject) => subject.totalAttempts > 0 || subject.questionCount > 0)
    .sort((a, b) => {
      if (b.totalAttempts !== a.totalAttempts) return b.totalAttempts - a.totalAttempts
      return b.questionCount - a.questionCount
    })

  const difficultyBreakdown: AnalyticsData["difficultyBreakdown"] = {
    easy: {
      count: difficultyAccumulator.easy.count,
      averageScore:
        difficultyAccumulator.easy.totalAnswers > 0
          ? round((difficultyAccumulator.easy.correctAnswers / difficultyAccumulator.easy.totalAnswers) * 100)
          : 0,
    },
    medium: {
      count: difficultyAccumulator.medium.count,
      averageScore:
        difficultyAccumulator.medium.totalAnswers > 0
          ? round((difficultyAccumulator.medium.correctAnswers / difficultyAccumulator.medium.totalAnswers) * 100)
          : 0,
    },
    hard: {
      count: difficultyAccumulator.hard.count,
      averageScore:
        difficultyAccumulator.hard.totalAnswers > 0
          ? round((difficultyAccumulator.hard.correctAnswers / difficultyAccumulator.hard.totalAnswers) * 100)
          : 0,
    },
  }

  return {
    overview: {
      totalUsers,
      totalQuizzes,
      totalQuestions,
      totalAttempts,
      averageScore: round(decimalToNumber(averageScoreAggregate._avg.score)),
      completionRate: totalAttempts > 0 ? round((completedAttempts / totalAttempts) * 100) : 0,
    },
    quizPerformance,
    questionAnalysis,
    timeSeriesData,
    subjectPerformance,
    difficultyBreakdown,
  }
}

export const getAnalyticsDataCached = unstable_cache(
  async (days: number) => buildAnalyticsData(days),
  ["admin-analytics-dashboard"],
  {
    revalidate: ANALYTICS_REVALIDATE_SECONDS,
    tags: ["analytics"],
  }
)

function escapeCsvCell(value: string | number): string {
  const normalized = String(value).replace(/"/g, '""')
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized
}

export async function buildAnalyticsCsv(days: number): Promise<string> {
  const data = await getAnalyticsDataCached(days)

  const lines: string[] = []
  lines.push(["القسم", "المؤشر", "القيمة"].map(escapeCsvCell).join(","))
  lines.push(["نظرة عامة", "إجمالي المستخدمين", data.overview.totalUsers].map(escapeCsvCell).join(","))
  lines.push(["نظرة عامة", "إجمالي الاختبارات", data.overview.totalQuizzes].map(escapeCsvCell).join(","))
  lines.push(["نظرة عامة", "إجمالي الأسئلة", data.overview.totalQuestions].map(escapeCsvCell).join(","))
  lines.push(["نظرة عامة", "إجمالي المحاولات", data.overview.totalAttempts].map(escapeCsvCell).join(","))
  lines.push(["نظرة عامة", "متوسط الدرجات", `${data.overview.averageScore}%`].map(escapeCsvCell).join(","))
  lines.push(["نظرة عامة", "معدل الإكمال", `${data.overview.completionRate}%`].map(escapeCsvCell).join(","))
  lines.push("")

  lines.push(["الاختبار", "المحاولات", "متوسط الدرجات", "متوسط الوقت بالثواني", "معدل الإكمال", "الصعوبة"].map(escapeCsvCell).join(","))
  for (const item of data.quizPerformance) {
    lines.push(
      [
        item.title,
        item.attempts,
        item.averageScore,
        item.averageTime,
        item.completionRate,
        item.difficulty,
      ]
        .map(escapeCsvCell)
        .join(",")
    )
  }
  lines.push("")

  lines.push(["المادة", "متوسط الدرجات", "إجمالي المحاولات", "عدد الأسئلة"].map(escapeCsvCell).join(","))
  for (const item of data.subjectPerformance) {
    lines.push(
      [item.subjectName, item.averageScore, item.totalAttempts, item.questionCount]
        .map(escapeCsvCell)
        .join(",")
    )
  }

  return `\uFEFF${lines.join("\n")}`
}

export async function buildAnalyticsExcelTsv(days: number): Promise<string> {
  const data = await getAnalyticsDataCached(days)

  const lines: string[] = []
  lines.push(["القسم", "المؤشر", "القيمة"].join("\t"))
  lines.push(["نظرة عامة", "إجمالي المستخدمين", String(data.overview.totalUsers)].join("\t"))
  lines.push(["نظرة عامة", "إجمالي الاختبارات", String(data.overview.totalQuizzes)].join("\t"))
  lines.push(["نظرة عامة", "إجمالي الأسئلة", String(data.overview.totalQuestions)].join("\t"))
  lines.push(["نظرة عامة", "إجمالي المحاولات", String(data.overview.totalAttempts)].join("\t"))
  lines.push(["نظرة عامة", "متوسط الدرجات", `${data.overview.averageScore}%`].join("\t"))
  lines.push(["نظرة عامة", "معدل الإكمال", `${data.overview.completionRate}%`].join("\t"))
  lines.push("")

  lines.push(["الاختبار", "المحاولات", "متوسط الدرجات", "متوسط الوقت بالثواني", "معدل الإكمال", "الصعوبة"].join("\t"))
  for (const item of data.quizPerformance) {
    lines.push(
      [
        item.title,
        String(item.attempts),
        String(item.averageScore),
        String(item.averageTime),
        String(item.completionRate),
        item.difficulty,
      ].join("\t")
    )
  }
  lines.push("")

  lines.push(["المادة", "متوسط الدرجات", "إجمالي المحاولات", "عدد الأسئلة"].join("\t"))
  for (const item of data.subjectPerformance) {
    lines.push(
      [
        item.subjectName,
        String(item.averageScore),
        String(item.totalAttempts),
        String(item.questionCount),
      ].join("\t")
    )
  }

  return `\uFEFF${lines.join("\n")}`
}