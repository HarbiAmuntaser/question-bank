import {
  BookOpen,
  Building2,
  FileQuestion,
  FileText,
  GraduationCap,
  LibraryBig,
  Newspaper,
  ScrollText,
  University,
  Eye,
} from "lucide-react"

import { DashboardRefreshButton } from "@/components/admin/dashboard-refresh-button"
import { SystemStatusPanel } from "@/components/admin/system-status-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardData } from "@/lib/admin/dashboard"
import { requireAdminPage } from "@/lib/server/admin-page-auth"
import type { DashboardActivityItem } from "@/types/dashboard"

function formatRelativeTime(dateString: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(dateString).getTime())
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return "الآن"
  if (diffMs < hour) return `منذ ${Math.floor(diffMs / minute).toLocaleString("ar-SA")} دقيقة`
  if (diffMs < day) return `منذ ${Math.floor(diffMs / hour).toLocaleString("ar-SA")} ساعة`
  return `منذ ${Math.floor(diffMs / day).toLocaleString("ar-SA")} يوم`
}

function activityColor(type: DashboardActivityItem["type"]): string {
  if (type === "quiz") return "bg-primary"
  if (type === "question") return "bg-[hsl(var(--brand-cyan))]"
  if (type === "chapter") return "bg-[hsl(var(--brand-amber))]"
  if (type === "summary") return "bg-[hsl(var(--brand-emerald))]"
  return "bg-sky-600"
}

export default async function AdminDashboard() {
  await requireAdminPage("dashboard:read")
  const { stats, recentActivity, system } = await getDashboardData()

  const statCards = [
    { title: "الجامعات", value: stats.universities, icon: Building2 },
    { title: "الكليات", value: stats.colleges, icon: University },
    { title: "التخصصات", value: stats.majors, icon: GraduationCap },
    { title: "المقررات", value: stats.subjects, icon: BookOpen },
    { title: "الفصول", value: stats.chapters, icon: FileText },
    { title: "الملخصات", value: stats.summaries, icon: ScrollText },
    { title: "الأسئلة", value: stats.questions, icon: FileQuestion },
    { title: "الاختبارات", value: stats.quizzes, icon: LibraryBig },
    { title: "المقالات المنشورة", value: stats.publishedBlogPosts, icon: Newspaper },
    { title: "مشاهدات المدونة", value: stats.blogViews, icon: Eye },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="mt-2 text-sm text-muted-foreground">ملخص المحتوى وحالة تشغيل مستواك.</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <DashboardRefreshButton />
          <span className="text-xs text-muted-foreground">
            آخر تحديث للإحصاءات: {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(stats.generatedAt))}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title} className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 shrink-0 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{stat.value.toLocaleString("ar-SA")}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">النشاط الأخير</CardTitle>
            <CardDescription>أحدث عمليات إنشاء المحتوى، وتُقرأ مباشرة دون كاش يومي.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length ? (
              <div className="divide-y">
                {recentActivity.map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${activityColor(activity.type)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={activity.title}>{activity.title}</p>
                      <p className="truncate text-xs text-muted-foreground" title={activity.subtitle}>{activity.subtitle}</p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground" dateTime={activity.createdAt}>
                      {formatRelativeTime(activity.createdAt)}
                    </time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                لا توجد أنشطة حديثة لعرضها.
              </p>
            )}
          </CardContent>
        </Card>

        <SystemStatusPanel system={system} />
      </div>
    </div>
  )
}
