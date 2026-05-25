// src/components/public/quizzes-listing.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Clock, Search, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type QuizItem = {
  id: string; title: string; description: string | null; timeLimit: number; createdAt: string | Date;
  _count: { questions: number };
  university?: { id: string; name: string } | null;
  major?: { id: string; name: string; degreeType: string | null; universityId: string } | null;
  subject?: { id: string; name: string; majorId: string } | null;
  chapter?: { id: string; name: string; subject: { id: string; name: string; majorId: string } } | null;
};

type University = { id: string; name: string };
type Major = { id: string; name: string; degreeType: string | null; universityId: string };
type Subject = { id: string; name: string; majorId: string };

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
  return (
    <section className="py-8 md:py-12" dir="rtl">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">تصفح الاختبارات</h1>
          <p className="mt-3 max-w-[700px] mx-auto text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-300">
            ابحث عن الاختبارات حسب الجامعة، التخصص، أو المادة.
          </p>
        </div>

        {/* فلاتر */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input placeholder="بحث عن اختبار..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-12 rounded-xl pr-10 text-right" />
          </div>

          <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
            <SelectTrigger className="h-12 rounded-xl text-right"><SelectValue placeholder="الجامعة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الجامعات</SelectItem>
              {universities.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={selectedMajor} onValueChange={setSelectedMajor} disabled={dynamicMajors.length === 0 && selectedUniversity !== "all"}>
            <SelectTrigger className="h-12 rounded-xl text-right"><SelectValue placeholder="التخصص" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التخصصات</SelectItem>
              {dynamicMajors.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={selectedDegreeType} onValueChange={setSelectedDegreeType}>
            <SelectTrigger className="h-12 rounded-xl text-right"><SelectValue placeholder="نوع الدرجة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع أنواع الدرجات</SelectItem>
              {degreeTypes.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={dynamicSubjects.length === 0 && (selectedUniversity !== "all" || selectedMajor !== "all")}>
            <SelectTrigger className="h-12 rounded-xl text-right"><SelectValue placeholder="المادة" /></SelectTrigger>
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
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="flex flex-col border-2 bg-white/90 shadow-md transition-all duration-300 hover:border-primary/40 hover:shadow-xl dark:bg-gray-800/90">
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-2 text-lg font-semibold sm:text-xl">{quiz.title}</CardTitle>
                  {quiz.title && <CardDescription className="text-gray-500 dark:text-gray-400 text-right" dir="rtl">{quiz.title}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-grow space-y-2.5">
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{quiz.description}</p>
                  <div className="flex items-center text-sm text-muted-foreground"><BookOpen className="h-4 w-4 mr-1" /><span>{quiz._count?.questions ?? 0} أسئلة</span></div>
                  <div className="flex items-center text-sm text-muted-foreground"><Clock className="h-4 w-4 mr-1" /><span>{quiz.timeLimit} دقيقة</span></div>
                  <p className="text-sm text-muted-foreground">الجامعة: {quiz.university?.name || "غير محدد"}</p>
                  <p className="text-sm text-muted-foreground">التخصص: {quiz.major?.name || "غير محدد"}</p>
                  <p className="text-sm text-muted-foreground">المادة: {quiz.subject?.name || quiz.chapter?.subject?.name || "غير محدد"}</p>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button asChild className="h-11 w-full rounded-xl"><Link href={`/quiz/${quiz.id}`}>ابدأ الاختبار</Link></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
