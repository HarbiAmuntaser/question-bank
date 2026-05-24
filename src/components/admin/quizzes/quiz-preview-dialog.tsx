"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription as CardDesc } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, FileQuestion, Award } from "lucide-react"
import type { QuestionWithRelations } from "@/types"

interface QuizPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  questions: QuestionWithRelations[] | undefined
  stats:
    | {
        totalAvailable: number
        selectedCount: number
        byDifficulty: Record<string, number>
        byType: Record<string, number>
        totalPoints: number
      }
    | undefined
  settings: {
    title: string
    timeLimit: number
    questionCount: number
    difficulty: string
  }
}

const questionTypeLabels = {
  multiple_choice: "اختيار متعدد",
  true_false: "صح/خطأ",
  short_answer: "إجابة قصيرة",
  essay: "مقال",
} as const

const difficultyLabels = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
} as const

const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  hard: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
} as const

export function QuizPreviewDialog({ open, onOpenChange, questions, stats, settings }: QuizPreviewDialogProps) {
  const qs = questions ?? []

  const safeStats = useMemo(() => {
    const fallback = {
      totalAvailable: 0,
      selectedCount: qs.length,
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      byType: { multiple_choice: 0, true_false: 0, short_answer: 0, essay: 0 },
      totalPoints: qs.reduce((sum, q) => sum + (q.points ?? 0), 0),
    }
    return stats ?? fallback
  }, [stats, qs])

  const [currentQuestion, setCurrentQuestion] = useState(0)

  // ✅ ثبّت المؤشر عند الفتح/تغير القائمة
  useEffect(() => {
    if (!open) return
    setCurrentQuestion(0)
  }, [open, qs.length])

  const q = qs[currentQuestion]
  const correctOption = q?.options?.find((o: any) => o?.isCorrect)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ✅ RTL + محاذاة يمين */}
      <DialogContent dir="rtl" className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden p-0 text-right">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b text-right">
            <DialogTitle>معاينة الاختبار: {settings.title}</DialogTitle>
            <DialogDescription>
              معاينة الاختبار المُنشأ مع {qs.length} سؤال من أصل {safeStats.totalAvailable} سؤال متاح
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                  {/* العمود الجانبي */}
                  <div className="space-y-4 min-h-0">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">إحصائيات الاختبار</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 flex-row-reverse justify-end">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">الوقت المحدد: {settings.timeLimit} دقيقة</span>
                        </div>
                        <div className="flex items-center gap-2 flex-row-reverse justify-end">
                          <FileQuestion className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">عدد الأسئلة: {safeStats.selectedCount}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-row-reverse justify-end">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">إجمالي النقاط: {safeStats.totalPoints}</span>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">توزيع الصعوبة</h4>
                          {(["easy", "medium", "hard"] as const).map((d) => (
                            <div key={d} className="flex justify-between items-center">
                              <Badge className={difficultyColors[d]}>{difficultyLabels[d]}</Badge>
                              <span className="text-sm arabic-numbers">{safeStats.byDifficulty?.[d] ?? 0}</span>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">أنواع الأسئلة</h4>
                          {(["multiple_choice", "true_false", "short_answer", "essay"] as const).map((t) => (
                            <div key={t} className="flex justify-between items-center">
                              <span className="text-sm">{questionTypeLabels[t]}</span>
                              <span className="text-sm arabic-numbers">{safeStats.byType?.[t] ?? 0}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="min-h-0">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">تصفح الأسئلة</CardTitle>
                        <CardDesc>اضغط على رقم السؤال للانتقال مباشرة</CardDesc>
                      </CardHeader>
                      <CardContent className="min-h-0">
                        {qs.length > 0 ? (
                          <ScrollArea className="max-h-[240px] pr-2">
                            <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-6 gap-2">
                              {qs.map((_, index) => (
                                <Button
                                  key={index}
                                  variant={currentQuestion === index ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentQuestion(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  {index + 1}
                                </Button>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="text-sm text-muted-foreground">لا توجد أسئلة للمعاينة.</div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* عرض السؤال */}
                  <div className="lg:col-span-2 min-h-0">
                    <Card className="min-h-0 flex flex-col">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <CardTitle className="text-lg">
                            السؤال {qs.length > 0 ? currentQuestion + 1 : 0} من {qs.length}
                          </CardTitle>

                          {qs.length > 0 && q ? (
                            <div className="flex gap-2 flex-wrap">
                              <Badge className={difficultyColors[q.difficultyLevel as "easy" | "medium" | "hard"]}>
                                {difficultyLabels[q.difficultyLevel as "easy" | "medium" | "hard"]}
                              </Badge>
                              <Badge variant="outline">
                                {questionTypeLabels[q.questionType as keyof typeof questionTypeLabels]}
                              </Badge>
                              <Badge variant="secondary">{q.points} نقطة</Badge>
                            </div>
                          ) : null}
                        </div>

                        {qs.length > 0 && q ? (
                          <CardDesc>
                            {q.chapter?.name} - {q.chapter?.subject?.name}
                          </CardDesc>
                        ) : null}
                      </CardHeader>

                      <CardContent className="flex-1 min-h-0 flex flex-col">
                        {qs.length === 0 || !q ? (
                          <div className="text-sm text-muted-foreground">لا توجد أسئلة للمعاينة.</div>
                        ) : (
                          <>
                            <ScrollArea className="flex-1 pr-2">
                              <div className="space-y-4">
                                {/* نص السؤال */}
                                <div className="p-4 bg-muted/50 rounded-lg">
                                  <p className="text-base leading-relaxed text-right">{q.questionText}</p>
                                </div>

                                {/* ✅ اختيار متعدد */}
                                {q.questionType === "multiple_choice" && (
                                  <div className="space-y-2">
                                    <h4 className="font-medium">الخيارات:</h4>
                                    {q.options?.map((option: any, index: number) => (
                                      <div
                                        key={option.id}
                                        className={`p-3 rounded-lg border ${
                                          option.isCorrect
                                            ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-900 dark:text-green-200"
                                            : "bg-muted/30 border-border"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                                            <span>{option.optionText}</span>
                                          </div>

                                          {option.isCorrect && (
                                            <Badge variant="secondary">الإجابة الصحيحة</Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* ✅ صح/خطأ مع توضيح الإجابة الصحيحة */}
                                {q.questionType === "true_false" && (
                                  <div className="space-y-2">
                                    <h4 className="font-medium">الخيارات:</h4>

                                    {q.options?.length ? (
                                      <div className="space-y-2">
                                        {q.options.map((option: any) => (
                                          <div
                                            key={option.id}
                                            className={`p-3 rounded-lg border ${
                                              option.isCorrect
                                                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-900 dark:text-green-200"
                                                : "bg-muted/30 border-border"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between gap-3">
                                              <span className="font-medium">{option.optionText}</span>
                                              {option.isCorrect && <Badge variant="secondary">الإجابة الصحيحة</Badge>}
                                            </div>
                                          </div>
                                        ))}

                                        <div className="text-sm text-muted-foreground">
                                          الإجابة الصحيحة:{" "}
                                          <span className="font-semibold">
                                            {correctOption?.optionText ?? "غير محددة"}
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950 dark:border-yellow-900">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                          لا توجد خيارات محفوظة لهذا السؤال (صح/خطأ) لتحديد الإجابة الصحيحة.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* شرح */}
                                {q.explanation && (
                                  <div className="space-y-2">
                                    <h4 className="font-medium">التفسير:</h4>
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-900">
                                      <p className="text-blue-800 dark:text-blue-200">{q.explanation}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Tags */}
                                {q.tags?.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-medium">العلامات:</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {q.tags.map((tag: string, index: number) => (
                                        <Badge key={index} variant="outline">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>

                            {/* أزرار التنقل */}
                            <div className="flex justify-between mt-4 pt-4 border-t">
                              <Button
                                variant="outline"
                                onClick={() => setCurrentQuestion((v) => Math.max(0, v - 1))}
                                disabled={currentQuestion === 0}
                              >
                                السؤال السابق
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setCurrentQuestion((v) => Math.min(qs.length - 1, v + 1))}
                                disabled={currentQuestion === qs.length - 1}
                              >
                                السؤال التالي
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
