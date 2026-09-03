// file: src/components/public/subject-details.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ArrowRight } from "lucide-react";
import type { InstitutionType } from "@/config/regions";

import type { PublicQuizAccessItem } from "@/components/public/subscription-access";
import { SubjectLearningSwitcher } from "@/components/public/subject-learning-switcher";
import {
  ChapterOverviewIntro,
  DirectSubjectLearningContent,
  SubjectChapterDirectory,
  SubjectQuizzesSection,
} from "@/components/public/subject-chapters";
import { SubjectStudySummaries } from "@/components/public/study-summaries/subject-study-summaries";
import { getPublishedSubjectSummaries } from "@/lib/server/study-summaries";
import { getSubjectChapterCatalog, type PublicSubjectQuiz } from "@/lib/server/subject-chapters";
import { getPublicSubjectByRouteKey } from "@/lib/server/public-education-loaders";
import { getPublicQuizzesBySubject } from "@/lib/server/public-quizzes";
import { stripPrefix, encodeSlugPath } from "@/lib/public/slug-utils";

export const revalidate = 21600;

const surfaceCardClass = "overflow-hidden border bg-card/95 shadow-sm";
const outlineButtonClass = "h-11 w-full rounded-lg sm:w-auto";

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
      visibility?: "country" | "global" | null;
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

async function fetchSubjectBySlugOrCode(subjectSlugRaw: string): Promise<{ subject: SubjectDto | null }> {
  return { subject: await getPublicSubjectByRouteKey(subjectSlugRaw) };
}

export async function SubjectDetails({
  cc,
  type,
  universitySlugPath,
  majorSlugPath,
  subjectSlugPath,
}: {
  cc: string;
  type: InstitutionType;
  universitySlugPath: string;
  majorSlugPath: string;
  subjectSlugPath: string;
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
  const isGlobalAcademy = subjType === "academy" && subject.major.university?.visibility === "global";

  if (subjType && subjType !== typeNorm) {
    redirect(
      `/${isGlobalAcademy ? ccNorm : subjCC}/${subjType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}/subjects/${encodeSlugPath(canonicalSubject)}`,
    );
  }

  if (subjCC && subjType && !isGlobalAcademy && subjCC !== ccNorm) {
    redirect(
      `/${subjCC}/${subjType}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}/subjects/${encodeSlugPath(canonicalSubject)}`,
    );
  }

  if (canonicalUni !== currentUni || canonicalMajor !== currentMajor || canonicalSubject !== currentSubject) {
    redirect(
      `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
        canonicalMajor,
      )}/subjects/${encodeSlugPath(canonicalSubject)}`,
    );
  }

  const basePath = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
    canonicalMajor,
  )}/subjects/${encodeSlugPath(canonicalSubject)}`;

  const majorLink = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}/majors/${encodeSlugPath(
    canonicalMajor,
  )}`;
  const uniLink = `/${ccNorm}/${typeNorm}/universities/${encodeSlugPath(canonicalUni)}`;

  const [summaries, chapterCatalog] = await Promise.all([
    getPublishedSubjectSummaries(subject.id),
    typeNorm === "school" ? Promise.resolve(null) : getSubjectChapterCatalog(subject.id),
  ]);

  const quizzes: QuizLite[] = typeNorm === "school"
    ? (await getPublicQuizzesBySubject(subject.id, { limit: "200" }).catch(() => [])) ?? []
    : [];

  const quizDetailsHref = (q: QuizLite) => {
    const raw = (q.seo?.slug || q.id || "").toString().trim();
    const cleaned = stripPrefix(raw, "اختبارات");
    const quizSeg = encodeSlugPath(cleaned || q.id);
    return `${basePath}/quizzes/${quizSeg}`;
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

  const catalogQuizCard = (quiz: PublicSubjectQuiz): PublicQuizAccessItem => ({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    timeLimit: quiz.timeLimit,
    accessType: quiz.accessType,
    isFreePreview: quiz.isFreePreview,
    href: `${basePath}/quizzes/${encodeSlugPath(stripPrefix(quiz.seoSlug || quiz.id, "اختبارات"))}`,
    _count: { questions: quiz.questionCount },
    chapter: quiz.chapter,
  });

  const hasChapters = Boolean(chapterCatalog?.chapters.length);
  const directCatalogQuizzes = chapterCatalog?.quizzes.map(catalogQuizCard) ?? [];
  const generalSummaries = summaries.filter((summary) => !summary.chapter);
  const comprehensiveQuizzes = (chapterCatalog?.quizzes ?? [])
    .filter((quiz) => quiz.questionCount > 0 && quiz.questionChapterIds.length > 1)
    .map(catalogQuizCard);
  const chapterCards = (chapterCatalog?.chapters ?? []).map((chapter) => ({
    ...chapter,
    href: `${basePath}/chapters/${encodeURIComponent(chapter.routeKey)}`,
    summariesCount: summaries.filter((summary) => summary.chapter?.id === chapter.id).length,
    quizzesCount: (chapterCatalog?.quizzes ?? []).filter(
      (quiz) => quiz.questionCount > 0 && quiz.questionChapterIds.length === 1 && quiz.questionChapterIds[0] === chapter.id,
    ).length,
  }));

  return (
    <div className="space-y-6 lg:space-y-8">
      <Card className={surfaceCardClass}>
        <CardHeader className="space-y-3 px-5 text-center sm:px-6">
          <div className="text-xs font-medium text-foreground/70">تفاصيل المادة</div>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{subject.name}</h1>
          {subject.description ? (
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-foreground/75 sm:text-base">
              {subject.description}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      {typeNorm === "school" ? (
        <SubjectLearningSwitcher
          quizzes={quizCards}
          summaries={summaries}
          subjectId={subject.id}
          majorId={subject.major.id}
          basePath={basePath}
        />
      ) : hasChapters ? (
        <div className="space-y-8">
          <ChapterOverviewIntro />
          <SubjectChapterDirectory chapters={chapterCards} />
          <SubjectStudySummaries
            summaries={generalSummaries}
            basePath={basePath}
            subjectId={subject.id}
            majorId={subject.major.id}
            heading="محتوى عام للمادة"
            description="ملخصات مرتبطة بالمادة مباشرة وليست محصورة في فصل محدد."
            headingId="general-subject-content-heading"
          />
          <SubjectQuizzesSection
            quizzes={comprehensiveQuizzes}
            subjectId={subject.id}
            majorId={subject.major.id}
            heading="اختبارات شاملة"
            description="اختبارات تجمع أسئلة من أكثر من فصل في المادة."
            headingId="comprehensive-subject-quizzes-heading"
          />
        </div>
      ) : (
        <DirectSubjectLearningContent
          summaries={summaries}
          quizzes={directCatalogQuizzes}
          basePath={basePath}
          subjectId={subject.id}
          majorId={subject.major.id}
        />
      )}

      <nav className="flex flex-col justify-center gap-3 pt-2 sm:flex-row" aria-label="روابط الرجوع">
        <Button asChild variant="outline" className={outlineButtonClass}>
          <Link href={majorLink} prefetch={false} className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" aria-hidden />
            الرجوع إلى التخصص
          </Link>
        </Button>

        <Button asChild variant="outline" className={outlineButtonClass}>
          <Link href={uniLink} prefetch={false} className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" aria-hidden />
            الرجوع إلى المؤسسة
          </Link>
        </Button>
      </nav>
    </div>
  );
}
