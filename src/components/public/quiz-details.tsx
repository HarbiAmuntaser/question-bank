// file: src/components/public/quiz-details.tsx
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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import type { InstitutionType } from "@/config/regions";
import { fetchJSON } from "@/lib/server/student-fetch";
import { stripPrefix, encodeSlugPath } from "@/lib/public/slug-utils";

import { GraduationCap, ArrowRight, Trophy, Share2, FileText } from "lucide-react";
import { QuizShare } from "@/components/public/quiz-share";

export const revalidate = 60;

type SeoLite = { slug: string | null };

type QuizPreview = {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  totalQuestions: number;
  totalPoints: number;
  createdAt: string | Date;
  seo?: SeoLite;
  context: {
    university: {
      id: string;
      name: string;
      code: string | null;
      logoUrl: string | null;
      countryCode: string | null;
      institutionType: string | null;
      seo?: SeoLite;
    };
    major: {
      id: string;
      name: string;
      code: string | null;
      degreeType: string | null;
      seo?: SeoLite;
    };
    subject: {
      id: string;
      name: string;
      code: string | null;
      seo?: SeoLite;
    };
  };
};

function normalizeInstitutionType(v: string | null): InstitutionType | null {
  const x = (v || "").trim().toLowerCase();
  return x === "university" || x === "school" || x === "academy" ? (x as InstitutionType) : null;
}

function qsDegreeType(v?: string | null) {
  const x = (v || "").trim();
  return x ? `?degreeType=${encodeURIComponent(x)}` : "";
}

async function fetchQuizPreviewBySlugOrId(quizSlugPathRaw: string) {
  const quizSlugPath = stripPrefix(quizSlugPathRaw, "اختبارات");

  // 1) slug
  const bySlug = await fetchJSON<QuizPreview>(
    `/api/v1/student/quizzes/preview/by-slug/${encodeSlugPath(quizSlugPath)}`
  );
  if (bySlug.ok && bySlug.data) return { quiz: bySlug.data };

  // 2) fallback id
  if (!quizSlugPath.includes("/")) {
    const byId = await fetchJSON<QuizPreview>(
      `/api/v1/student/quizzes/preview/by-id/${encodeURIComponent(quizSlugPath)}`
    );
    if (byId.ok && byId.data) return { quiz: byId.data };
  }

  return { quiz: null as QuizPreview | null };
}

export async function QuizDetails({
  cc,
  type,
  universitySlugPath,
  majorSlugPath,
  subjectSlugPath,
  quizSlugPath,
  degreeType,
}: {
  cc: string;
  type: InstitutionType;
  universitySlugPath: string;
  majorSlugPath: string;
  subjectSlugPath: string;
  quizSlugPath: string; // slug أو id (وقد يكون متعدد المقاطع)
  degreeType?: string | null;
}) {
  const ccNorm = (cc || "SA").toUpperCase();
  const typeNorm = type;

  const { quiz } = await fetchQuizPreviewBySlugOrId(quizSlugPath);
  if (!quiz) notFound();

  const uni = quiz.context.university;
  const major = quiz.context.major;
  const subject = quiz.context.subject;

  // canonical slugs
  const canonicalUni = stripPrefix(uni?.seo?.slug || universitySlugPath, "جامعات");
  const canonicalMajor = stripPrefix(major?.seo?.slug || majorSlugPath, "تخصصات");
  const canonicalSubject = stripPrefix(subject?.seo?.slug || subjectSlugPath, "مواد");
  const canonicalQuiz = stripPrefix(quiz?.seo?.slug || quizSlugPath, "اختبارات");

  const currentUni = stripPrefix(universitySlugPath, "جامعات");
  const currentMajor = stripPrefix(majorSlugPath, "تخصصات");
  const currentSubject = stripPrefix(subjectSlugPath, "مواد");
  const currentQuiz = stripPrefix(quizSlugPath, "اختبارات");

  // cc/type mismatch
  const uniCC = (uni.countryCode || "").toUpperCase();
  const uniType = normalizeInstitutionType(uni.institutionType);

  const canonicalPath =
    `/${uniCC || ccNorm}/${uniType || typeNorm}` +
    `/universities/${encodeSlugPath(canonicalUni)}` +
    `/majors/${encodeSlugPath(canonicalMajor)}` +
    `/subjects/${encodeSlugPath(canonicalSubject)}` +
    `/quizzes/${encodeSlugPath(canonicalQuiz)}` +
    `${qsDegreeType(degreeType)}`;

  if (uniCC && uniType && (uniCC !== ccNorm || uniType !== typeNorm)) {
    redirect(canonicalPath);
  }

  // slug mismatch (uni/major/subject/quiz) داخل نفس cc/type
  if (
    canonicalUni !== currentUni ||
    canonicalMajor !== currentMajor ||
    canonicalSubject !== currentSubject ||
    canonicalQuiz !== currentQuiz
  ) {
    redirect(
      `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}` +
        `/majors/${encodeSlugPath(canonicalMajor)}` +
        `/subjects/${encodeSlugPath(canonicalSubject)}` +
        `/quizzes/${encodeSlugPath(canonicalQuiz)}` +
        `${qsDegreeType(degreeType)}`
    );
  }

  const subjectLink =
    `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}` +
    `/majors/${encodeSlugPath(canonicalMajor)}` +
    `/subjects/${encodeSlugPath(canonicalSubject)}` +
    `${qsDegreeType(degreeType)}`;

  const majorLink =
    `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}` +
    `/majors/${encodeSlugPath(canonicalMajor)}`;

  const uniLink = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}`;

  // ✅ رابط مشاركة (نسبي يكفي — QuizShare سيحوله لمطلق على العميل)
  const shareUrl = canonicalPath;
  const shareText = `جرّب اختبار: ${quiz.title}`;

  return (
    <div className="space-y-6 lg:space-y-8">
      <Card className="overflow-hidden border-2 bg-white/90 shadow-lg backdrop-blur-sm dark:bg-gray-800/90">
        <CardHeader className="px-5 text-center sm:px-6">
          <CardTitle className="text-2xl font-bold leading-tight sm:text-3xl">{quiz.title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground sm:text-base" dir="rtl">
            {quiz.description || "صفحة تفاصيل الاختبار قبل البدء."}
          </CardDescription>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">{quiz.totalQuestions ?? 0} سؤال</Badge>
            <Badge variant="outline">{quiz.timeLimit} دقيقة</Badge>
            {typeof quiz.totalPoints === "number" ? (
              <Badge variant="outline">{quiz.totalPoints} نقطة</Badge>
            ) : null}
            {major.degreeType ? <Badge variant="outline">{major.degreeType}</Badge> : null}
            {subject.code ? <Badge variant="secondary">{subject.code}</Badge> : null}
          </div>

          <Separator className="mx-auto my-4 max-w-md" />

          <div className="flex flex-wrap justify-center gap-3 text-sm leading-relaxed text-muted-foreground">
            <Link
              href={uniLink}
              prefetch={false}
              className="flex min-h-9 items-center gap-2 rounded-md px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <GraduationCap className="h-4 w-4" aria-hidden />
              {uni.name}
            </Link>
            <span>•</span>
            <Link
              href={majorLink}
              prefetch={false}
              className="flex min-h-9 items-center gap-2 rounded-md px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
              {major.name}
            </Link>
            <span>•</span>
            <Link
              href={subjectLink}
              prefetch={false}
              className="flex min-h-9 items-center gap-2 rounded-md px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Trophy className="h-4 w-4" aria-hidden />
              {subject.name}
            </Link>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          {/* ✅ مشاركة */}
          <div className="flex items-center justify-center gap-2 text-center leading-relaxed text-muted-foreground">
            <Share2 className="h-4 w-4" aria-hidden />
            <span className="text-sm">شارك رابط الاختبار مع زملائك</span>
          </div>
          <QuizShare url={shareUrl} title={quiz.title} text={shareText} />

          {/* ✅ ابدأ الاختبار */}
          <div className="flex justify-center">
            <Button asChild className="h-11 w-full rounded-xl sm:w-auto">
              <Link href={`/quiz/${encodeURIComponent(quiz.id)}`} className="flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden />
                ابدأ الاختبار
              </Link>
            </Button>
          </div>

          <div className="mt-2 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline" className="h-11 w-full rounded-xl sm:w-auto">
              <Link href={subjectLink} prefetch={false}>
                الرجوع للمادة
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full rounded-xl sm:w-auto">
              <Link href={majorLink} prefetch={false}>
                الرجوع للتخصص
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
