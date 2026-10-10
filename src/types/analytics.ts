export interface AnalyticsData {
  overview: {
    studentSessions: number
    totalQuizzes: number
    totalQuestions: number
    totalAnswers: number
    totalAttempts: number
    averageScore: number
    completionRate: number
  }
  quizPerformance: {
    quizId: string
    title: string
    attempts: number
    averageScore: number
    averageTime: number
    completionRate: number
    difficulty: "easy" | "medium" | "hard"
  }[]
  subjectPerformance: {
    subjectId: string
    subjectName: string
    averageScore: number
    totalAttempts: number
  }[]
  blog: {
    totalPosts: number
    publishedPosts: number
    draftPosts: number
    publishedInPeriod: number
    totalViews: number
    topPosts: {
      id: string
      title: string
      viewsCount: number
      publishedAt: string | null
    }[]
  }
}
