"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, FileText, Loader2, Table } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface ExportReportsProps {
  days: number
}

type ExportFormat = "excel" | "csv"

const reportTypes = [
  {
    id: "overview",
    title: "تقرير النظرة العامة",
    description: "جلسات الطلاب، محاولات الاختبارات، إجابات الطلاب، ومتوسطات الأداء.",
    formats: ["excel", "csv"] as ExportFormat[],
  },
  {
    id: "quiz-performance",
    title: "تقرير أداء الاختبارات",
    description: "أكثر الاختبارات استخدامًا ومتوسط الدرجات ومعدلات الإكمال.",
    formats: ["excel", "csv"] as ExportFormat[],
  },
  {
    id: "subject-performance",
    title: "تقرير أداء المواد",
    description: "مقارنة أداء المواد حسب المحاولات ومتوسط درجات الطلاب.",
    formats: ["excel", "csv"] as ExportFormat[],
  },
]

function getFormatIcon(format: ExportFormat) {
  switch (format) {
    case "excel":
      return <FileSpreadsheet className="h-4 w-4" />
    case "csv":
      return <Table className="h-4 w-4" />
  }
}

function getFormatLabel(format: ExportFormat) {
  switch (format) {
    case "excel":
      return "Excel"
    case "csv":
      return "CSV"
  }
}

export function ExportReports({ days }: ExportReportsProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format)

    try {
      const response = await fetch(`/api/v1/admin/analytics/export?format=${format}&days=${days}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("export_failed")
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)

      const contentDisposition = response.headers.get("content-disposition") ?? ""
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/)
      const filename = filenameMatch?.[1] ?? `analytics-report.${format === "excel" ? "xls" : "csv"}`

      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success("تم تصدير التقرير بنجاح")
    } catch {
      toast.error("حدث خطأ أثناء تصدير التقرير")
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-5 w-5" />
            تصدير سريع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              onClick={() => handleExport("excel")}
              disabled={isExporting === "excel"}
              className="flex h-10 items-center gap-2"
            >
              {isExporting === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              تصدير Excel
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={isExporting === "csv"}
              className="flex h-10 items-center gap-2"
            >
              {isExporting === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Table className="h-4 w-4" />}
              تصدير CSV
            </Button>

            <Badge variant="outline" className="flex h-10 items-center justify-center px-3">
              PDF لاحقًا
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">تقارير مفصلة</CardTitle>
          <p className="text-sm text-muted-foreground">التصدير يعتمد على بيانات التحليلات التعليمية الحالية.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {reportTypes.map((report, index) => (
              <div key={report.id}>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium">{report.title}</h3>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {report.formats.map((format) => (
                      <Button
                        key={format}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport(format)}
                        disabled={isExporting === format}
                        className="flex h-9 items-center gap-2"
                      >
                        {isExporting === format ? <Loader2 className="h-4 w-4 animate-spin" /> : getFormatIcon(format)}
                        {getFormatLabel(format)}
                      </Button>
                    ))}
                  </div>
                </div>

                {index < reportTypes.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">ملاحظات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <span>التصدير الحالي يدعم CSV و Excel من نفس بيانات لوحة التحليلات.</span>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <span>لا يتم تصدير بيانات زيارات الصفحات أو الأجهزة؛ هذه تظل ضمن Vercel Analytics.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
