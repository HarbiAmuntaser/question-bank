export interface AnalyticsData {
  overview: {
    studentSessions: number
    adminUsers: number
    /** Backward-compatible alias for studentSessions. */
    totalUsers: number
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
  questionAnalysis: {
    questionId: string
    questionText: string
    answerCount: number
    correctRate: number
    incorrectRate: number
    averageTime: number
    difficulty: "easy" | "medium" | "hard"
    tags: string[]
  }[]
  timeSeriesData: {
    date: string
    attempts: number
    averageScore: number
    /** Backward-compatible alias for newStudentSessions. */
    newUsers: number
    newStudentSessions: number
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
