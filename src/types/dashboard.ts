export interface DashboardStats {
  universities: number
  colleges: number
  majors: number
  subjects: number
  chapters: number
  summaries: number
  questions: number
  quizzes: number
  publishedBlogPosts: number
  blogViews: number
  generatedAt: string
}

export interface DashboardActivityItem {
  id: string
  type: "quiz" | "question" | "chapter" | "summary" | "blog"
  title: string
  subtitle: string
  createdAt: string
}

export type RuntimeState = "enabled" | "disabled" | "misconfigured"

export interface DashboardSystemOverview {
  database: {
    status: "healthy" | "unavailable"
    latencyMs: number | null
  }
  runtime: {
    environment: string
    commitSha: string | null
  }
  configuration: {
    smtp: "configured" | "missing_or_invalid"
    r2: "configured" | "missing_or_invalid"
  }
  releaseControls: {
    payment: RuntimeState
    paymentReview: RuntimeState
    activationCodes: RuntimeState
    studentRegistration: RuntimeState
    googleAuth: RuntimeState
    telegram: RuntimeState
    adsense: RuntimeState
  }
  telegramOperations: {
    connectedChannels: number
    pendingJobs: number
    failedJobs: number
    lastCompletedAt: string | null
  }
}

export interface DashboardData {
  stats: DashboardStats
  recentActivity: DashboardActivityItem[]
  system: DashboardSystemOverview
}

export interface DashboardExternalCheck {
  service: "database" | "smtp" | "r2"
  status: "healthy" | "unavailable"
  latencyMs: number | null
}
