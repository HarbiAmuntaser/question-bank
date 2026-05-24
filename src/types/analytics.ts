export interface AnalyticsData {
  overview: {
    totalUsers: number
    totalQuizzes: number
    totalQuestions: number
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
  questionAnalysis: {
    questionId: string
    questionText: string
    correctRate: number
    averageTime: number
    difficulty: "easy" | "medium" | "hard"
    tags: string[]
  }[]
  timeSeriesData: {
    date: string
    attempts: number
    averageScore: number
    newUsers: number
  }[]
  subjectPerformance: {
    subjectId: string
    subjectName: string
    averageScore: number
    totalAttempts: number
    questionCount: number
  }[]
  difficultyBreakdown: {
    easy: { count: number; averageScore: number }
    medium: { count: number; averageScore: number }
    hard: { count: number; averageScore: number }
  }
}