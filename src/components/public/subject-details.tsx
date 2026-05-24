// file: src/components/public/subject-details.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Clock, BookOpen, GraduationCap, ArrowRight, FileText } from "lucide-react";
import type { InstitutionType } from "@/config/regions";

import { fetchJSON } from "@/lib/server/student-fetch";
import { stripPrefix, encodeSlugPath } from "@/lib/public/slug-utils";

export const revalidate = 300;

type SeoLite = { slug: string | null };

type SubjectDto = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  creditHours: number | null;
  semester: number | null;
  year: number | null;
  seo?: SeoLite;
  _count?: { chapters?: number; quizzes?: number };
  major: {
    id: string;
    name: string;
    code: string | null;
    degreeType: string | null;
    seo?: SeoLite;
    university: {
      id: string;
      name: string;
      code: string | null;
      logoUrl: string | null;
      countryCode: string | null;
      institutionType: string | null;
      seo?: SeoLite;
    };
  };
};

type QuizLite = {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  _count: { questions: number };
  chapter?: { id: string; name: string } | null;
  seo?: SeoLite; // من API by-subject
};

function normalizeInstitutionType(v: string | null): InstitutionType | null {
  const x = (v || "").trim().toLowerCase();
  return x === "university" || x === "school" || x === "academy" ? (x as InstitutionType) : null;
}

async function fetchSubjectBySlugOrCode(subjectSlugRaw: string) {
  const subjectSlug = stripPrefix(subjectSlugRaw, "مواد");

  const bySlug = await fetchJSON<SubjectDto>(
    `/api/v1/student/subjects/by-slug/${encodeSlugPath(subjectSlug)}`
  );
  if (bySlug.ok && bySlug.data) return { subject: bySlug.data };

  if (!subjectSlug.includes("/")) {
    const byCode = await fetchJSON<SubjectDto>(
      `/api/v1/student/subjects/by-code/${encodeURIComponent(subjectSlug)}`
    );
    if (byCode.ok && byCode.data) return { subject: byCode.data };
  }

  return { subject: null as SubjectDto | null };
}

function qsDegreeType(v?: string | null) {
  const x = (v || "").trim();
  return x ? `?degreeType=${encodeURIComponent(x)}` : "";
}

export async function SubjectDetails({
  cc,
  type,
  universitySlugPath,
  majorSlugPath,
  subjectSlugPath,
  degreeType,
}: {
  cc: string;
  type: InstitutionType;
  universitySlugPath: string;
  majorSlugPath: string;
  subjectSlugPath: string;
  degreeType?: string | null;
}) {
  const ccNorm = (cc || "SA").toUpperCase();
  const typeNorm = type;

  const { subject } = await fetchSubjectBySlugOrCode(subjectSlugPath);
  if (!subject) notFound();

  const canonicalUni = stripPrefix(subject.major.university?.seo?.slug || universitySlugPath, "جامعات");
  const canonicalMajor = stripPrefix(subject.major?.seo?.slug || majorSlugPath, "تخصصات");
  const canonicalSubject = stripPrefix(subject.seo?.slug || subjectSlugPath, "مواد");

  const currentUni = stripPrefix(universitySlugPath, "جامعات");
  const currentMajor = stripPrefix(majorSlugPath, "تخصصات");
  const currentSubject = stripPrefix(subjectSlugPath, "مواد");

  const subjCC = (subject.major.university?.countryCode || "").toUpperCase();
  const subjType = normalizeInstitutionType(subject.major.university?.institutionType || null);

  // mismatch → redirect للمسار الصحيح
  if (subjCC && subjType && (subjCC !== ccNorm || subjType !== typeNorm)) {
    redirect(
      `/${subjCC}/${subjType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor
      )}/subjects/${encodeSlugPath(canonicalSubject)}${qsDegreeType(degreeType)}`
    );
  }

  // canonical mismatch → redirect داخل نفس cc/type
  if (canonicalUni !== currentUni || canonicalMajor !== currentMajor || canonicalSubject !== currentSubject) {
    redirect(
      `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor
      )}/subjects/${encodeSlugPath(canonicalSubject)}${qsDegreeType(degreeType)}`
    );
  }

  const basePath = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
    canonicalMajor
  )}/subjects/${encodeSlugPath(canonicalSubject)}`;

  const majorLink = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(canonicalMajor)}`;
  const uniLink = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}`;

  // ✅ نجلب الاختبارات
  const quizzesRes = await fetchJSON<QuizLite[]>(
    `/api/v1/student/quizzes/by-subject/${subject.id}?limit=200${
      degreeType ? `&degreeType=${encodeURIComponent(degreeType)}` : ""
    }`
  );
  const quizzes = quizzesRes.ok && quizzesRes.data ? quizzesRes.data : [];

  const degreeOptions = ["بكالوريوس", "دبلوم"];

  const quizDetailsHref = (q: QuizLite) => {
    const raw = (q.seo?.slug || q.id || "").toString().trim();
    const cleaned = stripPrefix(raw, "اختبارات");
    const quizSeg = encodeSlugPath(cleaned || q.id);
    return `${basePath}/quizzes/${quizSeg}${qsDegreeType(degreeType)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg overflow-hidden">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl font-bold">{subject.name}</CardTitle>

          <CardDescription className="text-muted-foreground" dir="rtl">
            {subject.major?.degreeType ? subject.major.degreeType : "مادة"}
            {typeof subject.creditHours === "number" ? ` • ${subject.creditHours} ساعات` : ""}
          </CardDescription>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {subject.code ? <Badge variant="secondary">{subject.code}</Badge> : null}
            {typeof subject.semester === "number" ? <Badge variant="outline">الفصل: {subject.semester}</Badge> : null}
            {typeof subject.year === "number" ? <Badge variant="outline">السنة: {subject.year}</Badge> : null}
            {typeof subject._count?.chapters === "number" ? <Badge variant="outline">{subject._count.chapters} فصول</Badge> : null}
            {typeof subject._count?.quizzes === "number" ? <Badge variant="outline">{subject._count.quizzes} اختبارات</Badge> : null}
          </div>

          <Separator className="my-4 max-w-md mx-auto" />

          <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
            <Link href={uniLink} prefetch={false} className="hover:text-primary transition-colors flex items-center gap-2">
              <GraduationCap className="h-4 w-4" aria-hidden />
              {subject.major.university.name}
            </Link>
            <span>•</span>
            <Link href={majorLink} prefetch={false} className="hover:text-primary transition-colors flex items-center gap-2">
              <ArrowRight className="h-4 w-4" aria-hidden />
              {subject.major.name}
            </Link>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          {/* Description */}
          {subject.description ? (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-center max-w-3xl mx-auto">
              {subject.description}
            </p>
          ) : null}

          {/* Degree filter */}
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold">اختبارات هذه المادة</h2>
            <p className="text-muted-foreground mt-1">استخدم فلتر الدرجة إن كانت المادة لها مسارين</p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2">
            <Button asChild variant={!degreeType ? "default" : "outline"} className="h-11 rounded-xl">
              <Link href={basePath}>الكل</Link>
            </Button>

            {degreeOptions.map((opt) => (
              <Button
                key={opt}
                asChild
                variant={degreeType === opt ? "default" : "outline"}
                className="h-11 rounded-xl"
              >
                <Link href={`${basePath}?degreeType=${encodeURIComponent(opt)}`}>{opt}</Link>
              </Button>
            ))}
          </div>

          {/* Quizzes */}
          {quizzes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {quizzes.map((q) => (
                <Card
                  key={q.id}
                  className="group border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {q.title}
                    </CardTitle>
                    {q.chapter?.name ? (
                      <p className="text-xs text-muted-foreground mt-1">الفصل: {q.chapter.name}</p>
                    ) : null}
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4 pb-6">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {q.description || "لا يوجد وصف مختصر لهذا الاختبار."}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" aria-hidden /> {q._count?.questions ?? 0} أسئلة
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" aria-hidden /> {q.timeLimit} دقيقة
                      </span>
                    </div>

                    <Button asChild className="w-full h-11 rounded-xl">
                      <Link href={quizDetailsHref(q)} prefetch={false} className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4" aria-hidden />
                        عرض الاختبار
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              {degreeType ? "لا توجد اختبارات مطابقة لنوع الدرجة المحدد." : "لا توجد اختبارات لهذه المادة بعد."}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline" className="w-full sm:w-auto h-11 rounded-xl">
              <Link href={majorLink} prefetch={false} className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" aria-hidden />
                الرجوع إلى التخصص
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full sm:w-auto h-11 rounded-xl">
              <Link href={uniLink} prefetch={false} className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" aria-hidden />
                الرجوع إلى الجامعة
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
