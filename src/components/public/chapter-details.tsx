import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers3 } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { SubjectQuizzesSection } from "@/components/public/subject-chapters";
import type { PublicQuizAccessItem } from "@/components/public/subscription-access";
import { SubjectStudySummaries } from "@/components/public/study-summaries/subject-study-summaries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { InstitutionType } from "@/config/regions";
import { encodeSlugPath, stripPrefix } from "@/lib/public/slug-utils";
import { getPublishedSubjectSummaries } from "@/lib/server/study-summaries";
import {
  getPublicChapterByRouteKey,
  getSubjectChapterCatalog,
  type PublicSubjectQuiz,
} from "@/lib/server/subject-chapters";
import { getPublicSubjectByRouteKey } from "@/lib/server/public-education-loaders";

type SeoLite = { slug: string | null };

type ChapterSubjectDto = {
  id: string;
  name: string;
  seo?: SeoLite;
  major: {
    id: string;
    name: string;
    seo?: SeoLite;
    university: {
      id: string;
      countryCode: string | null;
      institutionType: string | null;
      visibility?: "country" | "global" | null;
      seo?: SeoLite;
    };
  };
};

async function fetchSubjectBySlugOrCode(subjectSlugRaw: string): Promise<ChapterSubjectDto | null> {
  return getPublicSubjectByRouteKey(subjectSlugRaw);
}

function normalizeInstitutionType(value: string | null): InstitutionType | null {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === "university" || normalized === "school" || normalized === "academy"
    ? normalized
    : null;
}

export async function ChapterDetails({
  cc,
  type,
  universitySlugPath,
  majorSlugPath,
  subjectSlugPath,
  chapterRouteKey,
}: {
  cc: string;
  type: InstitutionType;
  universitySlugPath: string;
  majorSlugPath: string;
  subjectSlugPath: string;
  chapterRouteKey: string;
}) {
  if (type === "school") notFound();

  const ccNorm = (cc || "SA").toUpperCase();
  const subject = await fetchSubjectBySlugOrCode(subjectSlugPath);
  if (!subject) notFound();

  const canonicalUni = stripPrefix(subject.major.university.seo?.slug || universitySlugPath, "جامعات");
  const canonicalMajor = stripPrefix(subject.major.seo?.slug || majorSlugPath, "تخصصات");
  const canonicalSubject = stripPrefix(subject.seo?.slug || subjectSlugPath, "مواد");
  const subjectType = normalizeInstitutionType(subject.major.university.institutionType);
  const subjectCountry = (subject.major.university.countryCode || "").toUpperCase();
  const isGlobalAcademy = subjectType === "academy" && subject.major.university.visibility === "global";

  if (!subjectType || subjectType === "school") notFound();

  const canonicalCountry = isGlobalAcademy ? ccNorm : subjectCountry || ccNorm;
  const subjectPath = `/${canonicalCountry}/${subjectType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
    canonicalMajor,
  )}/subjects/${encodeSlugPath(canonicalSubject)}`;

  if (subjectType !== type || (!isGlobalAcademy && subjectCountry && subjectCountry !== ccNorm)) {
    redirect(`${subjectPath}/chapters/${encodeURIComponent(chapterRouteKey)}`);
  }

  const chapter = await getPublicChapterByRouteKey(subject.id, chapterRouteKey);
  if (!chapter) notFound();

  const canonicalChapterPath = `${subjectPath}/chapters/${encodeURIComponent(chapter.routeKey)}`;
  const currentUni = stripPrefix(universitySlugPath, "جامعات");
  const currentMajor = stripPrefix(majorSlugPath, "تخصصات");
  const currentSubject = stripPrefix(subjectSlugPath, "مواد");
  if (
    currentUni !== canonicalUni ||
    currentMajor !== canonicalMajor ||
    currentSubject !== canonicalSubject ||
    chapter.routeKey !== chapterRouteKey
  ) redirect(canonicalChapterPath);

  const [summaries, catalog] = await Promise.all([
    getPublishedSubjectSummaries(subject.id),
    getSubjectChapterCatalog(subject.id),
  ]);

  const chapterSummaries = summaries.filter((summary) => summary.chapter?.id === chapter.id);
  const chapterQuizzes = catalog.quizzes
    .filter(
      (quiz) =>
        quiz.questionCount > 0 &&
        quiz.questionChapterIds.length === 1 &&
        quiz.questionChapterIds[0] === chapter.id,
    )
    .map((quiz: PublicSubjectQuiz): PublicQuizAccessItem => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      accessType: quiz.accessType,
      isFreePreview: quiz.isFreePreview,
      href: `${subjectPath}/quizzes/${encodeSlugPath(stripPrefix(quiz.seoSlug || quiz.id, "اختبارات"))}`,
      _count: { questions: quiz.questionCount },
      chapter: quiz.chapter,
    }));

  return (
    <div className="space-y-6 lg:space-y-8">
      <Card className="overflow-hidden border bg-card/95 shadow-sm">
        <CardHeader className="space-y-4 px-5 text-center sm:px-6">
          <div className="flex justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers3 className="h-5 w-5" aria-hidden />
            </span>
          </div>
          {chapter.chapterNumber ? (
            <div><Badge variant="secondary" className="arabic-numbers">الفصل {chapter.chapterNumber}</Badge></div>
          ) : null}
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{chapter.name}</h1>
          {chapter.description ? (
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-foreground/75 sm:text-base">
              {chapter.description}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      {chapter.learningObjectives.length ? (
        <section className="rounded-lg border bg-muted/25 p-4 sm:p-5" aria-labelledby="chapter-objectives-heading">
          <h2 id="chapter-objectives-heading" className="font-semibold">أهداف الفصل</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-foreground/80 sm:grid-cols-2">
            {chapter.learningObjectives.map((objective) => (
              <li key={objective} className="flex items-start gap-2">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SubjectStudySummaries
        summaries={chapterSummaries}
        basePath={subjectPath}
        subjectId={subject.id}
        majorId={subject.major.id}
        heading="ملخصات الفصل"
        description="ملخصات مرتبطة بهذا الفصل مباشرة."
        headingId="chapter-summaries-heading"
      />

      <SubjectQuizzesSection
        quizzes={chapterQuizzes}
        subjectId={subject.id}
        majorId={subject.major.id}
        heading="اختبارات الفصل"
        description="اختبارات تعتمد أسئلتها على هذا الفصل فقط."
        headingId="chapter-quizzes-heading"
      />

      {!chapterSummaries.length && !chapterQuizzes.length ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          لا يوجد محتوى منشور لهذا الفصل بعد.
        </div>
      ) : null}

      <nav className="flex justify-center pt-2" aria-label="الرجوع إلى المادة">
        <Button asChild variant="outline" className="h-11 w-full rounded-lg sm:w-auto">
          <Link href={subjectPath} prefetch={false} className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" aria-hidden />
            الرجوع إلى المادة
          </Link>
        </Button>
      </nav>
    </div>
  );
}
