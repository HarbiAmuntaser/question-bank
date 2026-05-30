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

import { GraduationCap, ArrowRight } from "lucide-react";
import type { InstitutionType } from "@/config/regions";

import { SubjectQuizzesAccessGrid, type PublicQuizAccessItem } from "@/components/public/subscription-access";
import { fetchJSON } from "@/lib/server/student-fetch";
import { stripPrefix, encodeSlugPath } from "@/lib/public/slug-utils";

export const revalidate = 21600;

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
  accessType: "inherit" | "free" | "paid";
  isFreePreview: boolean;
  _count: { questions: number };
  chapter?: { id: string; name: string } | null;
  seo?: SeoLite;
};

function normalizeInstitutionType(v: string | null): InstitutionType | null {
  const x = (v || "").trim().toLowerCase();
  return x === "university" || x === "school" || x === "academy" ? (x as InstitutionType) : null;
}

async function fetchSubjectBySlugOrCode(subjectSlugRaw: string) {
  const subjectSlug = stripPrefix(subjectSlugRaw, "مواد");

  const bySlug = await fetchJSON<SubjectDto>(
    `/api/v1/student/subjects/by-slug/${encodeSlugPath(subjectSlug)}`,
    undefined,
    21600,
  );
  if (bySlug.ok && bySlug.data) return { subject: bySlug.data };

  if (!subjectSlug.includes("/")) {
    const byCode = await fetchJSON<SubjectDto>(
      `/api/v1/student/subjects/by-code/${encodeURIComponent(subjectSlug)}`,
      undefined,
      21600,
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

  if (subjCC && subjType && (subjCC !== ccNorm || subjType !== typeNorm)) {
    redirect(
      `/${subjCC}/${subjType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}/subjects/${encodeSlugPath(canonicalSubject)}${qsDegreeType(degreeType)}`,
    );
  }

  if (canonicalUni !== currentUni || canonicalMajor !== currentMajor || canonicalSubject !== currentSubject) {
    redirect(
      `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}/subjects/${encodeSlugPath(canonicalSubject)}${qsDegreeType(degreeType)}`,
    );
  }

  const basePath = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
    canonicalMajor,
  )}/subjects/${encodeSlugPath(canonicalSubject)}`;

  const majorLink = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(canonicalMajor)}`;
  const uniLink = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}`;

  const quizzesRes = await fetchJSON<QuizLite[]>(
    `/api/v1/student/quizzes/by-subject/${subject.id}?limit=200${
      degreeType ? `&degreeType=${encodeURIComponent(degreeType)}` : ""
    }`,
    undefined,
    21600,
  );
  const quizzes = quizzesRes.ok && quizzesRes.data ? quizzesRes.data : [];

  const degreeOptions = ["بكالوريوس", "دبلوم"];

  const quizDetailsHref = (q: QuizLite) => {
    const raw = (q.seo?.slug || q.id || "").toString().trim();
    const cleaned = stripPrefix(raw, "اختبارات");
    const quizSeg = encodeSlugPath(cleaned || q.id);
    return `${basePath}/quizzes/${quizSeg}${qsDegreeType(degreeType)}`;
  };

  const quizCards: PublicQuizAccessItem[] = quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    timeLimit: q.timeLimit,
    accessType: q.accessType,
    isFreePreview: q.isFreePreview,
    href: quizDetailsHref(q),
    _count: q._count,
    chapter: q.chapter,
  }));

  return (
    <div className="space-y-6 lg:space-y-8">
      <Card className="overflow-hidden border-2 bg-white/90 shadow-lg backdrop-blur-sm dark:bg-gray-800/90">
        <CardHeader className="px-5 text-center sm:px-6">
          <CardTitle className="text-2xl font-bold leading-tight sm:text-3xl">{subject.name}</CardTitle>

          <CardDescription className="text-sm leading-relaxed text-muted-foreground sm:text-base" dir="rtl">
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

          <Separator className="mx-auto my-4 max-w-md" />

          <div className="flex flex-wrap justify-center gap-3 text-sm leading-relaxed text-muted-foreground">
            <Link
              href={uniLink}
              prefetch={false}
              className="flex min-h-9 items-center gap-2 rounded-md px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <GraduationCap className="h-4 w-4" aria-hidden />
              {subject.major.university.name}
            </Link>
            <span>•</span>
            <Link
              href={majorLink}
              prefetch={false}
              className="flex min-h-9 items-center gap-2 rounded-md px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
              {subject.major.name}
            </Link>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          {subject.description ? (
            <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              {subject.description}
            </p>
          ) : null}

          <div className="text-center">
            <h2 className="text-xl font-bold sm:text-2xl">اختبارات هذه المادة</h2>
            <p className="mt-1 text-muted-foreground">استخدم فلتر الدرجة إن كانت المادة لها مسارين</p>
          </div>

          <div className="grid grid-cols-1 justify-center gap-2 sm:flex sm:flex-wrap">
            <Button asChild variant={!degreeType ? "default" : "outline"} className="h-11 rounded-xl text-sm sm:w-auto sm:text-base">
              <Link href={basePath}>الكل</Link>
            </Button>

            {degreeOptions.map((opt) => (
              <Button
                key={opt}
                asChild
                variant={degreeType === opt ? "default" : "outline"}
                className="h-11 rounded-xl text-sm sm:w-auto sm:text-base"
              >
                <Link href={`${basePath}?degreeType=${encodeURIComponent(opt)}`}>{opt}</Link>
              </Button>
            ))}
          </div>

          {quizzes.length > 0 ? (
            <SubjectQuizzesAccessGrid quizzes={quizCards} subjectId={subject.id} majorId={subject.major.id} />
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              {degreeType ? "لا توجد اختبارات مطابقة لنوع الدرجة المحدد." : "لا توجد اختبارات لهذه المادة بعد."}
            </div>
          )}

          <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
            <Button asChild variant="outline" className="h-11 w-full rounded-xl sm:w-auto">
              <Link href={majorLink} prefetch={false} className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" aria-hidden />
                الرجوع إلى التخصص
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-11 w-full rounded-xl sm:w-auto">
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
