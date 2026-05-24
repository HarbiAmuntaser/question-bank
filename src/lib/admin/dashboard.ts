import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import type { DashboardActivityItem, DashboardData } from "@/types/dashboard"

export const DASHBOARD_REVALIDATE_SECONDS = 300

function toIsoString(date: Date): string {
  return date.toISOString()
}

function buildQuestionSubtitle(subjectName?: string | null, chapterName?: string | null): string {
  if (subjectName && chapterName) return `${subjectName} - ${chapterName}`
  if (chapterName) return chapterName
  if (subjectName) return subjectName
  return "تمت إضافة سؤال جديد"
}

function buildActivityTitle(questionText: string): string {
  const normalized = questionText.trim()
  if (normalized.length <= 90) return normalized
  return `${normalized.slice(0, 90)}...`
}

async function buildDashboardData(): Promise<DashboardData> {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    universities,
    majors,
    subjects,
    chapters,
    questions,
    quizzes,
    quizAttempts,
    activeSessions,
    completedAttempts24h,
    newQuestions7d,
    newQuizzes7d,
    recentQuizzes,
    recentQuestions,
    recentChapters,
  ] = await Promise.all([
    prisma.university.count(),
    prisma.major.count(),
    prisma.subject.count(),
    prisma.chapter.count(),
    prisma.question.count(),
    prisma.quiz.count(),
    prisma.quizAttempt.count(),
    prisma.anonymousSession.count({
      where: {
        lastActivity: {
          gte: last24Hours,
        },
      },
    }),
    prisma.quizAttempt.count({
      where: {
        isCompleted: true,
        completedAt: {
          gte: last24Hours,
        },
      },
    }),
    prisma.question.count({
      where: {
        createdAt: {
          gte: last7Days,
        },
      },
    }),
    prisma.quiz.count({
      where: {
        createdAt: {
          gte: last7Days,
        },
      },
    }),
    prisma.quiz.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
      select: {
        id: true,
        title: true,
        createdAt: true,
        subject: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.question.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
      select: {
        id: true,
        questionText: true,
        createdAt: true,
        chapter: {
          select: {
            name: true,
            subject: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.chapter.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
      select: {
        id: true,
        name: true,
        createdAt: true,
        subject: {
          select: {
            name: true,
          },
        },
      },
    }),
  ])

  const recentActivity: DashboardActivityItem[] = [
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
      title: "تمت إضافة أسئلة جديدة",
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
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  return {
    stats: {
      universities,
      majors,
      subjects,
      chapters,
      questions,
      quizzes,
      quizAttempts,
      activeSessions,
    },
    recentActivity,
    health: {
      databaseHealthy: true,
      questionsCount: questions,
      quizzesCount: quizzes,
      completedAttempts24h,
      newQuestions7d,
      newQuizzes7d,
      activeSessions24h: activeSessions,
    },
  }
}

export const getDashboardDataCached = unstable_cache(
  async () => buildDashboardData(),
  ["admin-dashboard-data"],
  {
    revalidate: DASHBOARD_REVALIDATE_SECONDS,
    tags: ["dashboard"],
  }
)