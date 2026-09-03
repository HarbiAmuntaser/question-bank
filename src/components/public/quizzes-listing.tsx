// src/components/public/quizzes-listing.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PublicLoadingState } from "@/components/public/public-loading-state";
import {
  isOpenWithoutStatus,
  QuizAccessAction,
  QuizAccessBadges,
  type AccessStatus,
  type PublicQuizAccessItem,
} from "@/components/public/subscription-access";
import { cn } from "@/lib/utils";
import { getDegreeTypeLabel } from "@/lib/degree-types";

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
  "flex h-full flex-col border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md";
const filterControlClass = "h-11 rounded-lg text-right";

interface QuizzesListingProps {
  initialQuizzes: QuizItem[];
  universities: University[];
  majors: Major[];
  subjects: Subject[];
}

export function QuizzesListing({ initialQuizzes, universities, majors, subjects }: QuizzesListingProps) {
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
  const [filtersTouched, setFiltersTouched] = useState(false);

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
    if (!filtersTouched) return;

    const controller = new AbortController();
    async function run() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set("searchTerm", searchTerm.trim());
        if (selectedUniversity !== "all") params.set("universityId", selectedUniversity);
        if (selectedMajor !== "all") params.set("majorId", selectedMajor);
        if (selectedDegreeType !== "all") params.set("degreeType", selectedDegreeType);
        if (selectedSubject !== "all") params.set("subjectId", selectedSubject);

        const query = params.toString();
        window.history.replaceState(window.history.state, "", query ? `/quizzes?${query}` : "/quizzes");

        const res = await fetch(query ? `/api/v1/student/quizzes?${query}` : "/api/v1/student/quizzes", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Failed to load quizzes (${res.status})`);

        const body = await res.json();
        if (!controller.signal.aborted) setQuizzes(body?.data ?? body ?? []);
      } catch {
        if (controller.signal.aborted) return;
        // Keep the current list visible when a filter refresh fails.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    const t = setTimeout(run, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [filtersTouched, searchTerm, selectedUniversity, selectedMajor, selectedDegreeType, selectedSubject]);

  const restrictedQuizIds = useMemo(
    () => quizzes.filter((quiz) => !isOpenWithoutStatus(quiz)).map((quiz) => quiz.id).join(","),
    [quizzes],
  );

  const refreshAccess = useCallback((signal?: AbortSignal) => {
    const ids = restrictedQuizIds;
    if (!ids) {
      setAccessItems({});
      setAccessLoading(false);
      return;
    }
    setAccessLoading(true);
    void fetch(`/api/v1/student/access/status?quizIds=${encodeURIComponent(ids)}`, { cache: "no-store", signal })
      .then((res) => res.json())
      .then((body) => {
        if (!signal?.aborted) setAccessItems(body?.data?.items ?? {});
      })
      .catch(() => {
        if (!signal?.aborted) setAccessItems({});
      })
      .finally(() => {
        if (!signal?.aborted) setAccessLoading(false);
      });
  }, [restrictedQuizIds]);

  useEffect(() => {
    const controller = new AbortController();
    refreshAccess(controller.signal);
    return () => controller.abort();
  }, [refreshAccess]);
  return (
    <section className="py-6 sm:py-8 md:py-12" dir="rtl" aria-busy={loading}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
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
            <Input
              aria-label="البحث عن اختبار"
              placeholder="بحث عن اختبار..."
              value={searchTerm}
              onChange={(event) => {
                setFiltersTouched(true);
                setSearchTerm(event.target.value);
              }}
              className={`${filterControlClass} pr-10`}
            />
          </div>

          <Select
            value={selectedUniversity}
            onValueChange={(value) => {
              setFiltersTouched(true);
              setSelectedUniversity(value);
              setSelectedMajor("all");
              setSelectedSubject("all");
            }}
          >
            <SelectTrigger className={filterControlClass} aria-label="تصفية الاختبارات حسب الجامعة"><SelectValue placeholder="الجامعة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الجامعات</SelectItem>
              {universities.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMajor}
            onValueChange={(value) => {
              setFiltersTouched(true);
              setSelectedMajor(value);
              setSelectedSubject("all");
            }}
            disabled={dynamicMajors.length === 0 && selectedUniversity !== "all"}
          >
            <SelectTrigger className={filterControlClass} aria-label="تصفية الاختبارات حسب التخصص"><SelectValue placeholder="التخصص" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التخصصات</SelectItem>
              {dynamicMajors.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select
            value={selectedDegreeType}
            onValueChange={(value) => {
              setFiltersTouched(true);
              setSelectedDegreeType(value);
            }}
          >
            <SelectTrigger className={filterControlClass} aria-label="تصفية الاختبارات حسب نوع الدرجة"><SelectValue placeholder="نوع الدرجة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع أنواع الدرجات</SelectItem>
              {degreeTypes.map((t) => (<SelectItem key={t} value={t}>{getDegreeTypeLabel(t)}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select
            value={selectedSubject}
            onValueChange={(value) => {
              setFiltersTouched(true);
              setSelectedSubject(value);
            }}
            disabled={dynamicSubjects.length === 0 && (selectedUniversity !== "all" || selectedMajor !== "all")}
          >
            <SelectTrigger className={filterControlClass} aria-label="تصفية الاختبارات حسب المادة"><SelectValue placeholder="المادة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المواد</SelectItem>
              {dynamicSubjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <PublicLoadingState
            title="جاري تحديث نتائج البحث..."
            description="نبحث داخل الاختبارات ونرتب النتائج حسب الفلاتر المختارة."
            cards={3}
            className="py-4"
          />
        ) : quizzes.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 py-12 text-center" role="status" aria-live="polite">
            <p className="px-4 text-base font-medium text-foreground/70 sm:text-lg">لا توجد اختبارات مطابقة لمعايير البحث.</p>
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
                  <h2 className="line-clamp-2 text-base font-semibold leading-snug sm:text-lg">{quiz.title}</h2>
                </CardHeader>
                <CardContent className="flex-grow space-y-3 pt-0">
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{quiz.description}</p>

                  {locked ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      هذا الاختبار يتطلب اشتراكًا، لكنه يبقى ظاهرًا حتى تعرف محتوى المادة قبل التفعيل.
                    </p>
                  ) : quiz.isFreePreview ? (
                    <p className="rounded-lg bg-[hsl(var(--brand-cyan)_/_0.08)] px-3 py-2 text-xs leading-relaxed text-[hsl(var(--brand-cyan))] dark:bg-[hsl(var(--brand-cyan)_/_0.14)]">
                      اختبار تجربة مجانية يمكنك البدء به مباشرة.
                    </p>
                  ) : null}

                  <div className="flex items-center gap-1 text-sm text-muted-foreground"><BookOpen className="h-4 w-4" aria-hidden /><span>{quiz._count?.questions ?? 0} أسئلة</span></div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-4 w-4" aria-hidden /><span>{quiz.timeLimit} دقيقة</span></div>
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
