import { Eye, FilePenLine, Newspaper, Send } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalyticsData } from "@/types/analytics"

export function BlogAnalytics({ data, initialDays }: { data: AnalyticsData["blog"]; initialDays: number }) {
  const cards = [
    { label: "إجمالي المقالات", value: data.totalPosts, icon: Newspaper },
    { label: "المقالات المنشورة", value: data.publishedPosts, icon: Send },
    { label: "المسودات", value: data.draftPosts, icon: FilePenLine },
    { label: "إجمالي المشاهدات", value: data.totalViews, icon: Eye },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">إحصاءات المدونة</CardTitle>
        <p className="text-xs text-muted-foreground">
          نُشر {data.publishedInPeriod.toLocaleString("ar-SA")} مقال خلال آخر {initialDays.toLocaleString("ar-SA")} يوم.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((item) => (
            <div key={item.label} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{item.label}</span>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="text-xl font-semibold tabular-nums">{item.value.toLocaleString("ar-SA")}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">الأكثر مشاهدة</h3>
          {data.topPosts.length ? (
            <div className="divide-y rounded-md border px-3">
              {data.topPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0 truncate text-sm" title={post.title}>{post.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {post.viewsCount.toLocaleString("ar-SA")} مشاهدة
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد مقالات منشورة بعد.</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
