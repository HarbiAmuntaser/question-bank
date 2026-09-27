import { SubjectQuizzesAccessGrid, type PublicQuizAccessItem } from "@/components/public/subscription-access";
import { SubjectChapterKindDirectory } from "@/components/public/subject-chapter-directory";
import {
  SubjectStudySummaries,
  type PublicStudySummaryCard,
} from "@/components/public/study-summaries/subject-study-summaries";
import type { PublicSubjectChapter } from "@/lib/server/subject-chapters";

export type SubjectChapterCard = PublicSubjectChapter & {
  summariesCount: number;
  quizzesCount: number;
  href: string;
};

export function SubjectChapterDirectory({ chapters }: { chapters: SubjectChapterCard[] }) {
  return (
    <section className="space-y-5" aria-label="فصول المادة">
      <SubjectChapterKindDirectory chapters={chapters} />
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
