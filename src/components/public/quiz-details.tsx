// file: src/components/public/quiz-details.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { InstitutionType } from "@/config/regions";
import { fetchJSON } from "@/lib/server/student-fetch";
import { stripPrefix, encodeSlugPath } from "@/lib/public/slug-utils";

import { ArrowRight, Share2 } from "lucide-react";
import { LazyQuizShare } from "@/components/public/lazy-quiz-share";
import { QuizDetailsAccessGate } from "@/components/public/subscription-access";

export const revalidate = 21600;

const surfaceCardClass = "overflow-hidden border bg-card/95 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900/80";
const outlineButtonClass = "h-11 w-full rounded-lg sm:w-auto";
const actionPanelClass = "rounded-lg border bg-muted/20 p-4 sm:p-5";

type SeoLite = { slug: string | null };

type QuizPreview = {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  totalQuestions: number;
  totalPoints: number;
  createdAt: string | Date;
  accessType: "inherit" | "free" | "paid";
  isFreePreview: boolean;
  seo?: SeoLite;
  context: {
    university: {
      id: string;
      name: string;
      code: string | null;
      logoUrl: string | null;
      countryCode: string | null;
      institutionType: string | null;
      visibility?: "country" | "global" | null;
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

async function fetchQuizPreviewBySlugOrId(quizSlugPathRaw: string) {
  const quizSlugPath = stripPrefix(quizSlugPathRaw, "اختبارات");

  const bySlug = await fetchJSON<QuizPreview>(
    `/api/v1/student/quizzes/preview/by-slug/${encodeSlugPath(quizSlugPath)}`,
    { cache: "no-store" },
    0,
  );
  if (bySlug.ok && bySlug.data) return { quiz: bySlug.data };

  if (!quizSlugPath.includes("/")) {
    const byId = await fetchJSON<QuizPreview>(
      `/api/v1/student/quizzes/preview/by-id/${encodeURIComponent(quizSlugPath)}`,
      { cache: "no-store" },
      0,
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
}: {
  cc: string;
  type: InstitutionType;
  universitySlugPath: string;
  majorSlugPath: string;
  subjectSlugPath: string;
  quizSlugPath: string;
}) {
  const ccNorm = (cc || "SA").toUpperCase();
  const typeNorm = type;

  const { quiz } = await fetchQuizPreviewBySlugOrId(quizSlugPath);
  if (!quiz) notFound();

  const uni = quiz.context.university;
  const major = quiz.context.major;
  const subject = quiz.context.subject;

  const canonicalUni = stripPrefix(uni?.seo?.slug || universitySlugPath, "جامعات");
  const canonicalMajor = stripPrefix(major?.seo?.slug || majorSlugPath, "تخصصات");
  const canonicalSubject = stripPrefix(subject?.seo?.slug || subjectSlugPath, "مواد");
  const canonicalQuiz = stripPrefix(quiz?.seo?.slug || quizSlugPath, "اختبارات");

  const currentUni = stripPrefix(universitySlugPath, "جامعات");
  const currentMajor = stripPrefix(majorSlugPath, "تخصصات");
  const currentSubject = stripPrefix(subjectSlugPath, "مواد");
  const currentQuiz = stripPrefix(quizSlugPath, "اختبارات");

  const uniCC = (uni.countryCode || "").toUpperCase();
  const uniType = normalizeInstitutionType(uni.institutionType);
  const isGlobalAcademy = uniType === "academy" && uni.visibility === "global";

  const canonicalPath =
    `/${isGlobalAcademy ? ccNorm : uniCC || ccNorm}/${uniType || typeNorm}` +
    `/universities/${encodeSlugPath(canonicalUni)}` +
    `/majors/${encodeSlugPath(canonicalMajor)}` +
    `/subjects/${encodeSlugPath(canonicalSubject)}` +
    `/quizzes/${encodeSlugPath(canonicalQuiz)}`;

  if (uniType && uniType !== typeNorm) {
    redirect(canonicalPath);
  }

  if (uniCC && uniType && !isGlobalAcademy && uniCC !== ccNorm) {
    redirect(canonicalPath);
  }

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
        `/quizzes/${encodeSlugPath(canonicalQuiz)}`,
    );
  }

  const subjectLink =
    `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}` +
    `/majors/${encodeSlugPath(canonicalMajor)}` +
    `/subjects/${encodeSlugPath(canonicalSubject)}`;

  const majorLink =
    `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}` +
    `/majors/${encodeSlugPath(canonicalMajor)}`;

  const shareUrl = canonicalPath;
  const shareText = `جرّب اختبار: ${quiz.title}`;

  return (
    <div className="space-y-6 lg:space-y-8">
      <Card className={surfaceCardClass}>
        <CardHeader className="space-y-3 px-5 text-center sm:px-6">
          <div className="text-xs font-medium text-foreground/70">تفاصيل الاختبار</div>

          <CardTitle className="text-2xl font-bold leading-tight sm:text-3xl">{quiz.title}</CardTitle>

          {quiz.description ? (
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-foreground/75 sm:text-base">
              {quiz.description}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Badge variant="secondary">{quiz.totalQuestions ?? 0} سؤال</Badge>
            <Badge variant="outline">{quiz.timeLimit} دقيقة</Badge>
            {typeof quiz.totalPoints === "number" ? <Badge variant="outline">{quiz.totalPoints} نقطة</Badge> : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          <div className={actionPanelClass}>
            <div className="mb-4 text-center">
              <h2 className="text-lg font-semibold leading-tight sm:text-xl">جاهز للبدء؟</h2>
            </div>

            <QuizDetailsAccessGate
              quizId={quiz.id}
              title={quiz.title}
              href={`/quiz/${encodeURIComponent(quiz.id)}`}
              accessType={quiz.accessType}
              isFreePreview={quiz.isFreePreview}
              subjectId={subject.id}
              majorId={major.id}
            />
          </div>

          <div className="space-y-3 rounded-lg border bg-background/70 p-4 text-center">
            <div className="flex items-center justify-center gap-2 leading-relaxed text-foreground/70">
              <Share2 className="h-4 w-4" aria-hidden />
              <span className="text-sm">شارك رابط الاختبار مع زملائك</span>
            </div>
            <LazyQuizShare url={shareUrl} title={quiz.title} text={shareText} />
          </div>

          <div className="mt-2 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline" className={outlineButtonClass}>
              <Link href={subjectLink} prefetch={false} className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" aria-hidden />
                الرجوع للمادة
              </Link>
            </Button>
            <Button asChild variant="outline" className={outlineButtonClass}>
              <Link href={majorLink} prefetch={false} className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" aria-hidden />
                الرجوع للتخصص
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
