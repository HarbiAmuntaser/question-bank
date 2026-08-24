import Link from "next/link";
import { BookOpenCheck, ClipboardCheck, FileText, Layers3 } from "lucide-react";

import { SubjectQuizzesAccessGrid, type PublicQuizAccessItem } from "@/components/public/subscription-access";
import {
  SubjectStudySummaries,
  type PublicStudySummaryCard,
} from "@/components/public/study-summaries/subject-study-summaries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicSubjectChapter } from "@/lib/server/subject-chapters";

export type SubjectChapterCard = PublicSubjectChapter & {
  summariesCount: number;
  quizzesCount: number;
  href: string;
};

export function SubjectChapterDirectory({ chapters }: { chapters: SubjectChapterCard[] }) {
  return (
    <section className="space-y-5" aria-labelledby="subject-chapters-heading">
      <div className="text-center">
        <h2 id="subject-chapters-heading" className="text-xl font-bold sm:text-2xl">
          فصول المادة
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
          اختر فصلًا للوصول إلى ملخصاته واختباراته المرتبطة.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {chapters.map((chapter) => (
          <Card key={chapter.id} className="border bg-card/95 shadow-sm transition-colors hover:border-primary/40">
            <CardHeader className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  {chapter.chapterNumber ? (
                    <Badge variant="secondary" className="arabic-numbers">
                      الفصل {chapter.chapterNumber}
                    </Badge>
                  ) : null}
                  <CardTitle className="text-lg font-bold leading-7 sm:text-xl">{chapter.name}</CardTitle>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Layers3 className="h-5 w-5" aria-hidden />
                </span>
              </div>
              {chapter.description ? (
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{chapter.description}</p>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-5 pb-5 pt-0">
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-foreground/75">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" aria-hidden />
                  <span className="arabic-numbers">{chapter.summariesCount}</span> ملخصات
                </span>
                <span className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />
                  <span className="arabic-numbers">{chapter.quizzesCount}</span> اختبارات
                </span>
              </div>
              <Button asChild className="h-11 w-full rounded-lg sm:w-auto sm:self-start">
                <Link href={chapter.href} prefetch={false}>تفاصيل الفصل</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function SubjectQuizzesSection({
  quizzes,
  subjectId,
  majorId,
  heading = "اختبارات هذه المادة",
  description = "اختر اختبارًا لقياس فهمك للمادة ومراجعة مستواك.",
  headingId = "subject-quizzes-heading",
}: {
  quizzes: PublicQuizAccessItem[];
  subjectId: string;
  majorId: string;
  heading?: string;
  description?: string;
  headingId?: string;
}) {
  if (!quizzes.length) return null;

  return (
    <section className="space-y-5" aria-labelledby={headingId}>
      <div className="text-center">
        <h2 id={headingId} className="text-xl font-bold sm:text-2xl">{heading}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>
      <SubjectQuizzesAccessGrid quizzes={quizzes} subjectId={subjectId} majorId={majorId} />
    </section>
  );
}

export function DirectSubjectLearningContent({
  summaries,
  quizzes,
  basePath,
  subjectId,
  majorId,
}: {
  summaries: PublicStudySummaryCard[];
  quizzes: PublicQuizAccessItem[];
  basePath: string;
  subjectId: string;
  majorId: string;
}) {
  if (!summaries.length && !quizzes.length) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        لا يوجد محتوى متاح لهذه المادة بعد.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SubjectStudySummaries
        summaries={summaries}
        basePath={basePath}
        subjectId={subjectId}
        majorId={majorId}
      />
      <SubjectQuizzesSection quizzes={quizzes} subjectId={subjectId} majorId={majorId} />
    </div>
  );
}

export function ChapterOverviewIntro() {
  return (
    <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
      <BookOpenCheck className="h-4 w-4" aria-hidden />
      محتوى منظم حسب فصول المادة
    </div>
  );
}
