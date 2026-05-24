"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, FileJson, FileImage } from "lucide-react"

interface QuizExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (format: string, options: ExportOptions) => void
  isLoading?: boolean
}

interface ExportOptions {
  includeAnswers: boolean
  includeExplanations: boolean
  includeStatistics: boolean
  includeMetadata: boolean
}

export function QuizExportDialog({ open, onOpenChange, onExport, isLoading = false }: QuizExportDialogProps) {
  const [format, setFormat] = useState("json")
  const [options, setOptions] = useState<ExportOptions>({
    includeAnswers: true,
    includeExplanations: true,
    includeStatistics: true,
    includeMetadata: true,
  })

  const handleExport = () => {
    onExport(format, options)
  }

  const formatOptions = [
    {
      value: "json",
      label: "JSON",
      description: "ملف JSON للاستيراد في أنظمة أخرى",
      icon: FileJson,
    },
    {
      value: "pdf",
      label: "PDF",
      description: "ملف PDF للطباعة والمشاركة",
      icon: FileText,
    },
    {
      value: "word",
      label: "Word",
      description: "مستند Word للتحرير",
      icon: FileImage,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>تصدير الاختبار</DialogTitle>
          <DialogDescription>اختر تنسيق التصدير والخيارات المطلوبة</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">تنسيق التصدير</Label>
            <RadioGroup value={format} onValueChange={setFormat}>
              {formatOptions.map((option) => {
                const Icon = option.icon
                return (
                  <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="flex items-center gap-3 cursor-pointer flex-1">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">خيارات التصدير</CardTitle>
              <CardDescription>اختر المعلومات التي تريد تضمينها في التصدير</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="includeAnswers"
                  checked={options.includeAnswers}
                  onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, includeAnswers: checked as boolean }))}
                />
                <Label htmlFor="includeAnswers" className="cursor-pointer">
                  تضمين الإجابات الصحيحة
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="includeExplanations"
                  checked={options.includeExplanations}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeExplanations: checked as boolean }))
                  }
                />
                <Label htmlFor="includeExplanations" className="cursor-pointer">
                  تضمين التفسيرات
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="includeStatistics"
                  checked={options.includeStatistics}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeStatistics: checked as boolean }))
                  }
                />
                <Label htmlFor="includeStatistics" className="cursor-pointer">
                  تضمين الإحصائيات
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="includeMetadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeMetadata: checked as boolean }))
                  }
                />
                <Label htmlFor="includeMetadata" className="cursor-pointer">
                  تضمين معلومات إضافية (التاريخ، المؤلف، إلخ)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Format-specific notes */}
          {format === "pdf" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>ملاحظة:</strong> سيتم تنسيق الاختبار بشكل احترافي مع ترقيم الأسئلة وتنسيق مناسب للطباعة.
              </p>
            </div>
          )}

          {format === "word" && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>ملاحظة:</strong> سيتم إنشاء مستند Word قابل للتحرير مع تنسيق احترافي.
              </p>
            </div>
          )}

          {format === "json" && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>ملاحظة:</strong> ملف JSON مناسب للاستيراد في أنظمة إدارة التعلم الأخرى.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleExport} disabled={isLoading} className="gap-2">
            <Download className="h-4 w-4" />
            {isLoading ? "جاري التصدير..." : "تصدير"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
