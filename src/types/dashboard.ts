export interface DashboardStats {
  universities: number
  majors: number
  subjects: number
  chapters: number
  questions: number
  quizzes: number
  quizAttempts: number
  activeSessions: number
}

export interface DashboardActivityItem {
  id: string
  type: "quiz" | "question" | "chapter"
  title: string
  subtitle: string
  createdAt: string
}

export interface DashboardHealth {
  databaseHealthy: boolean
  questionsCount: number
  quizzesCount: number
  completedAttempts24h: number
  newQuestions7d: number
  newQuizzes7d: number
  activeSessions24h: number
}

export interface DashboardData {
  stats: DashboardStats
  recentActivity: DashboardActivityItem[]
  health: DashboardHealth
}