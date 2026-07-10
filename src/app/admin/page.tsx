import { headers as nextHeaders } from "next/headers"
import { getRequestOrigin } from "@/lib/server/request-origin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardData } from "@/types/dashboard"
import {
  Building2,
  GraduationCap,
  BookOpen,
  FileQuestion,
  Users,
  TrendingUp,
  FileText,
  ClipboardList,
} from "lucide-react"

interface ApiResponse<T> {
  data: T
}

async function getApiBase(): Promise<string> {
  return getRequestOrigin()
}

async function buildHeaders(): Promise<Headers> {
  const incoming = await nextHeaders()
  const headers = new Headers()
  headers.set("accept", "application/json")

  const adminKey = process.env.ADMIN_API_KEY
  if (adminKey) headers.set("x-admin-key", adminKey)

  const cookie = incoming.get("cookie")
  if (cookie) headers.set("cookie", cookie)

  return headers
}

async function getDashboardData(): Promise<DashboardData> {
  const base = await getApiBase()
  const res = await fetch(`${base}/api/v1/admin/dashboard`, {
    headers: await buildHeaders(),
    next: { revalidate: 300, tags: ["dashboard"] },
  })

  if (!res.ok) {
    throw new Error("فشل تحميل بيانات لوحة التحكم")
  }

  const payload = (await res.json()) as ApiResponse<DashboardData>
  return payload.data
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = Math.max(0, now - then)

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return "الآن"
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute)
    return minutes === 1 ? "منذ دقيقة" : `منذ ${minutes} دقائق`
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour)
    return hours === 1 ? "منذ ساعة" : `منذ ${hours} ساعات`
  }

  const days = Math.floor(diffMs / day)
  return days === 1 ? "منذ يوم" : `منذ ${days} أيام`
}

function getActivityDotColor(type: DashboardData["recentActivity"][number]["type"]): string {
  switch (type) {
    case "quiz":
      return "bg-primary"
    case "question":
      return "bg-[hsl(var(--brand-cyan))]"
    case "chapter":
      return "bg-[hsl(var(--brand-amber))]"
  }
}

export default async function AdminDashboard() {
  const { stats, recentActivity, health } = await getDashboardData()

  const statCards = [
    {
      title: "الجامعات",
      value: stats.universities,
      description: "إجمالي الجامعات المسجلة",
      icon: Building2,
      color: "text-primary",
    },
    {
      title: "التخصصات",
      value: stats.majors,
      description: "البرامج الأكاديمية المتاحة",
      icon: GraduationCap,
      color: "text-green-600",
    },
    {
      title: "المقررات",
      value: stats.subjects,
      description: "المقررات في النظام",
      icon: BookOpen,
      color: "text-[hsl(var(--brand-cyan))]",
    },
    {
      title: "الفصول",
      value: stats.chapters,
      description: "فصول المقررات",
      icon: FileText,
      color: "text-[hsl(var(--brand-amber))]",
    },
    {
      title: "الأسئلة",
      value: stats.questions,
      description: "إجمالي الأسئلة المنشأة",
      icon: FileQuestion,
      color: "text-primary",
    },
    {
      title: "الاختبارات",
      value: stats.quizzes,
      description: "الاختبارات المُنشأة",
      icon: ClipboardList,
      color: "text-[hsl(var(--brand-cyan))]",
    },
    {
      title: "محاولات الاختبار",
      value: stats.quizAttempts,
      description: "محاولات الطلاب في الاختبارات",
      icon: Users,
      color: "text-[hsl(var(--brand-emerald))]",
    },
    {
      title: "الجلسات النشطة",
      value: stats.activeSessions,
      description: "آخر 24 ساعة",
      icon: TrendingUp,
      color: "text-primary",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="mt-2 font-medium text-foreground/70">مرحباً بك في لوحة إدارة مستواك</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold arabic-numbers">{stat.value.toLocaleString("ar-SA")}</div>
                <p className="text-xs font-medium text-foreground/65">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>النشاط الأخير</CardTitle>
            <CardDescription className="text-foreground/70">آخر أنشطة النظام الفعلية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="flex items-center space-x-4 space-x-reverse">
                    <div className={`h-2 w-2 rounded-full ${getActivityDotColor(activity.type)}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs font-medium text-foreground/65">{activity.subtitle}</p>
                    </div>
                    <p className="text-xs font-medium text-foreground/65">{formatRelativeTime(activity.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground/70">لا توجد أنشطة حديثة لعرضها</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مؤشرات النظام</CardTitle>
            <CardDescription className="text-foreground/70">مؤشرات تشغيل حقيقية من قاعدة البيانات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">قاعدة البيانات</span>
                <span className={health.databaseHealthy ? "text-sm text-green-600" : "text-sm text-red-600"}>
                  {health.databaseHealthy ? "سليمة" : "غير متاحة"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">الجلسات النشطة آخر 24 ساعة</span>
                <span className="text-sm text-green-600 arabic-numbers">
                  {health.activeSessions24h.toLocaleString("ar-SA")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">محاولات مكتملة آخر 24 ساعة</span>
                <span className="text-sm text-green-600 arabic-numbers">
                  {health.completedAttempts24h.toLocaleString("ar-SA")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">أسئلة جديدة آخر 7 أيام</span>
                <span className="text-sm text-green-600 arabic-numbers">
                  {health.newQuestions7d.toLocaleString("ar-SA")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">اختبارات جديدة آخر 7 أيام</span>
                <span className="text-sm text-green-600 arabic-numbers">
                  {health.newQuizzes7d.toLocaleString("ar-SA")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">مستواك</span>
                <span className="text-sm text-green-600 arabic-numbers">
                  {health.questionsCount.toLocaleString("ar-SA")} سؤال
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">الاختبارات الحالية</span>
                <span className="text-sm text-green-600 arabic-numbers">
                  {health.quizzesCount.toLocaleString("ar-SA")} اختبار
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
