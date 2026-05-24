"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Download, Table, FileSpreadsheet, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"

interface ExportReportsProps {
  days: number
}

type ExportFormat = "excel" | "csv"

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

  const reportTypes = [
    {
      id: "overview",
      title: "تقرير النظرة العامة",
      description: "إحصائيات شاملة عن أداء النظام والمستخدمين",
      formats: ["excel", "csv"] as ExportFormat[],
    },
    {
      id: "quiz-performance",
      title: "تقرير أداء الاختبارات",
      description: "تحليل مفصل لأداء كل اختبار ومعدلات النجاح",
      formats: ["excel", "csv"] as ExportFormat[],
    },
    {
      id: "subject-performance",
      title: "تقرير أداء المواد",
      description: "مقارنة أداء الطلاب في المواد المختلفة",
      formats: ["excel", "csv"] as ExportFormat[],
    },
  ]

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case "excel":
        return <FileSpreadsheet className="h-4 w-4" />
      case "csv":
        return <Table className="h-4 w-4" />
    }
  }

  const getFormatLabel = (format: ExportFormat) => {
    switch (format) {
      case "excel":
        return "Excel"
      case "csv":
        return "CSV"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تصدير سريع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleExport("excel")}
              disabled={isExporting === "excel"}
              className="flex items-center gap-2"
            >
              {isExporting === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              تصدير Excel
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={isExporting === "csv"}
              className="flex items-center gap-2"
            >
              {isExporting === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Table className="h-4 w-4" />}
              تصدير CSV
            </Button>

            <Badge variant="outline" className="px-3 py-2">
              PDF لاحقًا
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تقارير مفصلة</CardTitle>
          <p className="text-sm text-muted-foreground">التصدير الحالي فعلي ويعتمد على بيانات API الحالية والكاش</p>
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
                        className="flex items-center gap-2"
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

      <Card>
        <CardHeader>
          <CardTitle>ملاحظات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            التصدير الحالي يدعم CSV و Excel بشكل فعلي من نفس بيانات لوحة التحليلات.
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            تصدير PDF يحتاج مكتبة مخصصة أو قالب HTML للطباعة ثم تحويله لاحقًا.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}