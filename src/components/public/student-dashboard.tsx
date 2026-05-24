"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { QuizResult } from "@/types"
import { Trophy, Clock, Target, TrendingUp, BookOpen, Star, Calendar, BarChart3, Award } from "lucide-react"
import Link from "next/link"

export function StudentDashboard() {
  const [results, setResults] = useState<QuizResult[]>([])
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    totalTime: 0,
    bestScore: 0,
    streak: 0,
  })

  useEffect(() => {
    // Load results from localStorage
    const savedResults = localStorage.getItem("quiz_results")
    if (savedResults) {
      try {
        const parsedResults: QuizResult[] = JSON.parse(savedResults)
        setResults(parsedResults)
        calculateStats(parsedResults)
      } catch (error) {
        console.error("Error loading results:", error)
      }
    }
  }, [])

  const calculateStats = (results: QuizResult[]) => {
    if (results.length === 0) return

    const totalQuizzes = results.length
    const averageScore = results.reduce((sum, result) => sum + result.percentage, 0) / totalQuizzes
    const totalTime = results.reduce((sum, result) => sum + result.duration, 0)
    const bestScore = Math.max(...results.map((result) => result.percentage))

    // Calculate streak (consecutive days with quizzes)
    const dates = results.map((result) => new Date(result.completedAt).toDateString())
    const uniqueDates = [...new Set(dates)].sort()
    let streak = 0
    const today = new Date().toDateString()

    for (let i = uniqueDates.length - 1; i >= 0; i--) {
      const date = new Date(uniqueDates[i])
      const daysDiff = Math.floor((new Date(today).getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff === streak) {
        streak++
      } else {
        break
      }
    }

    setStats({
      totalQuizzes,
      averageScore: Math.round(averageScore),
      totalTime,
      bestScore: Math.round(bestScore),
      streak,
    })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours} ساعة و ${minutes} دقيقة`
    }
    return `${minutes} دقيقة`
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "ممتاز":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "جيد جداً":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "جيد":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "مقبول":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      default:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    }
  }

  const recentResults = results.slice(-5).reverse()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">لوحة التحكم الشخصية</h1>
        <p className="text-gray-600 dark:text-gray-400">تتبع تقدمك وأدائك في الاختبارات</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الاختبارات</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
            <p className="text-xs text-muted-foreground">اختبار مكتمل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المعدل العام</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground">متوسط الدرجات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أفضل نتيجة</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bestScore}%</div>
            <p className="text-xs text-muted-foreground">أعلى درجة حققتها</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الوقت الإجمالي</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(stats.totalTime / 3600)}</div>
            <p className="text-xs text-muted-foreground">ساعة دراسة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">سلسلة الأيام</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.streak}</div>
            <p className="text-xs text-muted-foreground">يوم متتالي</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="history">سجل الاختبارات</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  النشاط الأخير
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentResults.length > 0 ? (
                  <div className="space-y-4">
                    {recentResults.map((result, index) => (
                      <div
                        key={result.sessionId}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <Trophy className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">اختبار #{result.sessionId.slice(-6)}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {new Date(result.completedAt).toLocaleDateString("ar-SA")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getGradeColor(result.grade)}>{result.grade}</Badge>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {Math.round(result.percentage)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">لم تقم بأي اختبار بعد</p>
                    <Button asChild className="mt-4">
                      <Link href="/quizzes">ابدأ اختبارك الأول</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  نظرة على الأداء
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>المعدل العام</span>
                    <span>{stats.averageScore}%</span>
                  </div>
                  <Progress value={stats.averageScore} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>أفضل نتيجة</span>
                    <span>{stats.bestScore}%</span>
                  </div>
                  <Progress value={stats.bestScore} className="h-2" />
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{stats.totalQuizzes}</div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">اختبار مكتمل</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{stats.streak}</div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">يوم متتالي</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>سجل الاختبارات الكامل</CardTitle>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <div className="space-y-4">
                  {results.reverse().map((result) => (
                    <div
                      key={result.sessionId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Award className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">اختبار #{result.sessionId.slice(-8)}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(result.completedAt).toLocaleDateString("ar-SA", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getGradeColor(result.grade)}>{result.grade}</Badge>
                          <span className="font-bold">{Math.round(result.percentage)}%</span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {result.correctAnswers}/{result.totalQuestions} • {formatDuration(result.duration)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد اختبارات بعد</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">ابدأ رحلتك التعليمية واختبر معلوماتك</p>
                  <Button asChild>
                    <Link href="/quizzes">استكشف الاختبارات</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  اتجاهات الأداء
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                      <div className="text-3xl font-bold text-primary mb-2">{stats.averageScore}%</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">متوسط الأداء العام</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Star className="h-6 w-6 text-green-600 mx-auto mb-2" />
                        <div className="text-xl font-bold text-green-600">{stats.bestScore}%</div>
                        <p className="text-xs text-green-700 dark:text-green-300">أفضل نتيجة</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <div className="text-xl font-bold text-blue-600">
                          {Math.round(stats.totalTime / stats.totalQuizzes / 60)}
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">دقيقة/اختبار</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">لا توجد بيانات كافية للتحليل</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Study Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  توصيات للدراسة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.averageScore < 70 && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">تحسين الأداء</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        معدلك الحالي {stats.averageScore}%. ننصح بمراجعة المواد والتركيز على نقاط الضعف.
                      </p>
                    </div>
                  )}

                  {stats.streak === 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">الانتظام في الدراسة</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        حاول أن تحل اختبار واحد على الأقل يومياً لبناء عادة دراسية منتظمة.
                      </p>
                    </div>
                  )}

                  {stats.averageScore >= 80 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">أداء ممتاز!</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        أداؤك ممتاز بمعدل {stats.averageScore}%. استمر في هذا المستوى وجرب اختبارات أكثر تحدياً.
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">نصائح عامة</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• راجع الأسئلة الخاطئة لتجنب تكرار الأخطاء</li>
                      <li>• خصص وقتاً منتظماً للدراسة يومياً</li>
                      <li>• ركز على المواضيع التي تحصل فيها على درجات أقل</li>
                      <li>• استخدم تقنيات إدارة الوقت أثناء الاختبار</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="flex items-center gap-2">
              <Link href="/quizzes">
                <BookOpen className="h-4 w-4" />
                استكشف الاختبارات
              </Link>
            </Button>
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <BarChart3 className="h-4 w-4" />
              تصدير التقرير
            </Button>
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Target className="h-4 w-4" />
              تحديد أهداف جديدة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
