// src/components/public/quizzes-listing.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Search, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  isOpenWithoutStatus,
  QuizAccessAction,
  QuizAccessBadges,
  type AccessStatus,
  type PublicQuizAccessItem,
} from "@/components/public/subscription-access";
import { cn } from "@/lib/utils";

type QuizItem = {
  id: string; title: string; description: string | null; timeLimit: number; createdAt: string | Date;
  accessType: "inherit" | "free" | "paid";
  isFreePreview: boolean;
  _count: { questions: number };
  university?: { id: string; name: string } | null;
  major?: { id: string; name: string; degreeType: string | null; universityId: string } | null;
  subject?: { id: string; name: string; majorId: string } | null;
  chapter?: { id: string; name: string; subject: { id: string; name: string; majorId: string } } | null;
};

type University = { id: string; name: string };
type Major = { id: string; name: string; degreeType: string | null; universityId: string };
type Subject = { id: string; name: string; majorId: string };

const quizCardClass =
  "flex h-full flex-col border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:bg-gray-900/80";
const filterControlClass = "h-11 rounded-lg text-right";

interface QuizzesListingProps {
  initialQuizzes: QuizItem[];
  universities: University[];
  majors: Major[];
  subjects: Subject[];
}

export function QuizzesListing({ initialQuizzes, universities, majors, subjects }: QuizzesListingProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [quizzes, setQuizzes] = useState<QuizItem[]>(initialQuizzes);
  const [accessItems, setAccessItems] = useState<Record<string, AccessStatus>>({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("searchTerm") || "");
  const [selectedUniversity, setSelectedUniversity] = useState(searchParams.get("universityId") || "all");
  const [selectedMajor, setSelectedMajor] = useState(searchParams.get("majorId") || "all");
  const [selectedDegreeType, setSelectedDegreeType] = useState(searchParams.get("degreeType") || "all");
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get("subjectId") || "all");
  const [loading, setLoading] = useState(false);

  // التصفية المحلية للقوائم التابعة
  const dynamicMajors = useMemo(() => {
    if (selectedUniversity === "all") return majors;
    return majors.filter((m) => m.universityId === selectedUniversity);
  }, [selectedUniversity, majors]);

  const dynamicSubjects = useMemo(() => {
    if (selectedMajor !== "all") {
      return subjects.filter((s) => s.majorId === selectedMajor);
    }
    if (selectedUniversity !== "all") {
      const majorIds = new Set(dynamicMajors.map((m) => m.id));
      return subjects.filter((s) => majorIds.has(s.majorId));
    }
    return subjects;
  }, [selectedMajor, selectedUniversity, dynamicMajors, subjects]);

  const degreeTypes = useMemo(() => {
    const types = new Set<string>();
    majors.forEach((m) => m.degreeType && types.add(m.degreeType));
    return Array.from(types).sort();
  }, [majors]);

  // جلب الاختبارات المفلترة من الـ API
  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set("searchTerm", searchTerm);
      if (selectedUniversity !== "all") params.set("universityId", selectedUniversity);
      if (selectedMajor !== "all") params.set("majorId", selectedMajor);
      if (selectedDegreeType !== "all") params.set("degreeType", selectedDegreeType);
      if (selectedSubject !== "all") params.set("subjectId", selectedSubject);

      router.push(`/quizzes?${params.toString()}`, { scroll: false });

      const res = await fetch(`/api/v1/student/quizzes?${params.toString()}`, {
        signal: controller.signal,
        next: { revalidate: 0 },
      });
      const body = await res.json();
      setQuizzes(body?.data ?? body ?? []);
      setLoading(false);
    }

    const t = setTimeout(run, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [searchTerm, selectedUniversity, selectedMajor, selectedDegreeType, selectedSubject, router]);
// عند تغيير الجامعة: صفّر التخصص والمادة
useEffect(() => {
  setSelectedMajor("all");
  setSelectedSubject("all");
}, [selectedUniversity]);

// عند تغيير التخصص: صفّر المادة
useEffect(() => {
  setSelectedSubject("all");
}, [selectedMajor]);

  const refreshAccess = () => {
    const ids = quizzes.map((quiz) => quiz.id).join(",");
    if (!ids) {
      setAccessItems({});
      return;
    }
    setAccessLoading(true);
    void fetch(`/api/v1/student/access/status?quizIds=${encodeURIComponent(ids)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => setAccessItems(body?.data?.items ?? {}))
      .catch(() => setAccessItems({}))
      .finally(() => setAccessLoading(false));
  };

  useEffect(refreshAccess, [quizzes]);
  return (
    <section className="py-8 md:py-12" dir="rtl">
      <div className="container px-4 md:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">تصفح الاختبارات</h1>
          <p className="mx-auto mt-3 max-w-[700px] text-sm leading-relaxed text-muted-foreground sm:text-base">
            ابحث عن الاختبارات حسب الجامعة، التخصص، أو المادة.
          </p>
        </div>

        {/* فلاتر */}
        <div className="mb-8 grid grid-cols-1 gap-3 rounded-lg border bg-card/95 p-4 shadow-sm sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input placeholder="بحث عن اختبار..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${filterControlClass} pr-10`} />
          </div>

          <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
            <SelectTrigger className={filterControlClass}><SelectValue placeholder="الجامعة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الجامعات</SelectItem>
              {universities.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={selectedMajor} onValueChange={setSelectedMajor} disabled={dynamicMajors.length === 0 && selectedUniversity !== "all"}>
            <SelectTrigger className={filterControlClass}><SelectValue placeholder="التخصص" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التخصصات</SelectItem>
              {dynamicMajors.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={selectedDegreeType} onValueChange={setSelectedDegreeType}>
            <SelectTrigger className={filterControlClass}><SelectValue placeholder="نوع الدرجة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع أنواع الدرجات</SelectItem>
              {degreeTypes.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={dynamicSubjects.length === 0 && (selectedUniversity !== "all" || selectedMajor !== "all")}>
            <SelectTrigger className={filterControlClass}><SelectValue placeholder="المادة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المواد</SelectItem>
              {dynamicSubjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xl text-muted-foreground">لا توجد اختبارات مطابقة لمعايير البحث.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
            {quizzes.map((quiz) => {
              const access = accessItems[quiz.id] ?? null;
              const locked = !isOpenWithoutStatus(quiz) && !access?.allowed;
              const quizAccessLoading = accessLoading && !isOpenWithoutStatus(quiz);

              return (
              <Card
                key={quiz.id}
                className={cn(
                  quizCardClass,
                  locked
                    ? "border-amber-200/70 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10"
                    : quiz.isFreePreview || quiz.accessType === "free"
                      ? "border-emerald-200/70 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                      : access?.allowed
                        ? "border-primary/25 bg-primary/5"
                        : "",
                )}
              >
                <CardHeader className="space-y-3 pb-3">
                  <QuizAccessBadges quiz={quiz} access={access} loading={quizAccessLoading} />
                  <CardTitle className="line-clamp-2 text-base font-semibold leading-snug sm:text-lg">{quiz.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-3 pt-0">
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{quiz.description}</p>

                  {locked ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      هذا الاختبار يتطلب اشتراكًا، لكنه يبقى ظاهرًا حتى تعرف محتوى المادة قبل التفعيل.
                    </p>
                  ) : quiz.isFreePreview ? (
                    <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-800 dark:bg-sky-950/30 dark:text-sky-200">
                      اختبار تجربة مجانية يمكنك البدء به مباشرة.
                    </p>
                  ) : null}

                  <div className="flex items-center gap-1 text-sm text-muted-foreground"><BookOpen className="h-4 w-4" /><span>{quiz._count?.questions ?? 0} أسئلة</span></div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-4 w-4" /><span>{quiz.timeLimit} دقيقة</span></div>
                  <p className="text-sm text-muted-foreground">الجامعة: {quiz.university?.name || "غير محدد"}</p>
                  <p className="text-sm text-muted-foreground">التخصص: {quiz.major?.name || "غير محدد"}</p>
                  <p className="text-sm text-muted-foreground">المادة: {quiz.subject?.name || quiz.chapter?.subject?.name || "غير محدد"}</p>
                </CardContent>
                <div className="p-6 pt-0">
                  <QuizAccessAction
                    quiz={{
                      id: quiz.id,
                      title: quiz.title,
                      description: quiz.description,
                      timeLimit: quiz.timeLimit,
                      accessType: quiz.accessType,
                      isFreePreview: quiz.isFreePreview,
                      href: `/quiz/${quiz.id}`,
                      _count: quiz._count,
                    } satisfies PublicQuizAccessItem}
                    access={access}
                    loading={quizAccessLoading}
                    onRedeemed={refreshAccess}
                  />
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
