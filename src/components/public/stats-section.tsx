// ============================================================================
// file: src/components/public/stats-section.tsx  (مُحدّث ل/student API + تحسينات)
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, GraduationCap, Trophy, Target, Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { studentGet } from "@/lib/student-client";
import type { PlatformStats } from "@/types/student";

export function StatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const nf = new Intl.NumberFormat("ar-SA");

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr(null);

    studentGet<PlatformStats>(`/api/v1/student/stats`, undefined, ac.signal)
      .then((data) => setStats(data))
      .catch((e) => setErr(e.message || "فشل تحميل الإحصائيات"))
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  const statsData = [
    {
      icon: GraduationCap,
      value: stats?.totalUniversities ?? 0,
      label: "جامعة سعودية",
      description: "من أفضل الجامعات في المملكة",
      gradient: "from-blue-500 to-cyan-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      icon: BookOpen,
      value: stats?.totalSubjects ?? 0,
      label: "مقرر دراسي",
      description: "في جميع التخصصات",
      gradient: "from-green-500 to-emerald-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      icon: Trophy,
      value: stats?.totalQuizzes ?? 0,
      label: "اختبار تفاعلي",
      description: "جاهز للحل والممارسة",
      gradient: "from-purple-500 to-pink-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      icon: Target,
      value: stats?.totalQuestions ?? 0,
      label: "سؤال متنوع",
      description: "في جميع المستويات",
      gradient: "from-orange-500 to-red-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
    },
  ];

  return (
    <section
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden"
      aria-labelledby="stats-heading"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/patterns/islamic-pattern-white.svg')] opacity-5" aria-hidden />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl shadow-lg" aria-hidden>
              <Star className="h-10 w-10 text-white" />
            </div>
            <h2 id="stats-heading" className="text-4xl lg:text-5xl font-bold text-white">
              إحصائيات المنصة
            </h2>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            أرقام تعكس التزامنا بتقديم أفضل تجربة تعليمية للطلاب في المملكة العربية السعودية
          </p>
        </motion.div>

        {/* Error state */}
        {err && (
          <div className="max-w-3xl mx-auto text-center rounded-2xl p-4 mb-8 bg-red-400/10 border border-red-300/30 text-red-100">
            {err}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8" aria-live="polite">
          {statsData.map((stat, index) => (
            <motion.div
              key={index}
              initial={reduceMotion ? false : { opacity: 0, y: 30 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.1 * index }}
              whileHover={reduceMotion ? {} : { y: -10, scale: 1.05 }}
              className="group"
            >
              <Card className="h-full bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 shadow-xl hover:shadow-2xl">
                <CardContent className="p-8 text-center">
                  {/* Icon */}
                  <div
                    className={`w-20 h-20 ${stat.bgColor} rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <div className={`w-16 h-16 bg-gradient-to-r ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                      <stat.icon className="h-8 w-8 text-white" aria-hidden />
                    </div>
                  </div>

                  {/* Number */}
                  <motion.div
                    initial={reduceMotion ? false : { scale: 0.9 }}
                    animate={reduceMotion ? {} : { scale: 1 }}
                    transition={{ delay: reduceMotion ? 0 : 0.3 + index * 0.1, type: "spring", stiffness: 200 }}
                    className="mb-4"
                  >
                    {loading ? (
                      <div className="w-16 h-12 bg-white/20 rounded-lg mx-auto animate-pulse" aria-label="جاري التحميل" />
                    ) : (
                      <div className="text-5xl lg:text-6xl font-bold text-white mb-2">
                        {nf.format(stat.value)}+
                      </div>
                    )}
                  </motion.div>

                  {/* Label */}
                  <h3 className="text-xl font-bold text-white mb-2">{stat.label}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{stat.description}</p>

                  {/* Decorative */}
                  <div className="mt-6 flex justify-center" aria-hidden>
                    <div className={`w-12 h-1 bg-gradient-to-r ${stat.gradient} rounded-full`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.6 }}
          className="text-center mt-16"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4">انضم إلى آلاف الطلاب</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              ابدأ رحلتك التعليمية اليوم واستفد من أكبر مكتبة أسئلة تعليمية في المملكة
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="/quizzes"
                whileHover={reduceMotion ? {} : { scale: 1.05 }}
                whileTap={reduceMotion ? {} : { scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-400 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                aria-label="ابدأ الآن مجاناً"
              >
                ابدأ الآن مجاناً
              </motion.a>
              <motion.a
                href="/universities"
                whileHover={reduceMotion ? {} : { scale: 1.05 }}
                whileTap={reduceMotion ? {} : { scale: 0.95 }}
                className="px-8 py-4 bg-white/20 text-white font-semibold rounded-2xl border border-white/30 hover:bg-white/30 transition-all duration-300"
                aria-label="تعرف على المزيد"
              >
                تعرف على المزيد
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
