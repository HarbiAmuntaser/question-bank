"use client";

import { useState } from "react";
import { BookOpen, BookOpenText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubjectQuizzesAccessGrid, type PublicQuizAccessItem } from "@/components/public/subscription-access";
import {
  SubjectStudySummaries,
  type PublicStudySummaryCard,
} from "@/components/public/study-summaries/subject-study-summaries";
import { cn } from "@/lib/utils";

type ActivePanel = "quizzes" | "summaries";

function SubjectQuizzesPanel({
  quizzes,
  subjectId,
  majorId,
}: {
  quizzes: PublicQuizAccessItem[];
  subjectId: string;
  majorId: string;
}) {
  return (
    <section id="subject-quizzes" className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold sm:text-2xl">اختبارات هذه المادة</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
          تظهر الاختبارات المرتبطة بهذا المقرر ضمن درجة التخصص المختارة سابقًا.
        </p>
      </div>

      {quizzes.length > 0 ? (
        <SubjectQuizzesAccessGrid quizzes={quizzes} subjectId={subjectId} majorId={majorId} />
      ) : (
        <div className="py-10 text-center text-muted-foreground">لا توجد اختبارات لهذه المادة بعد.</div>
      )}
    </section>
  );
}

export function SubjectLearningSwitcher({
  quizzes,
  summaries,
  subjectId,
  majorId,
  basePath,
}: {
  quizzes: PublicQuizAccessItem[];
  summaries: PublicStudySummaryCard[];
  subjectId: string;
  majorId: string;
  basePath: string;
}) {
  const [activePanel, setActivePanel] = useState<ActivePanel>("quizzes");
  const hasSummaries = summaries.length > 0;

  if (!hasSummaries) {
    return <SubjectQuizzesPanel quizzes={quizzes} subjectId={subjectId} majorId={majorId} />;
  }

  const buttonClass = (active: boolean) =>
    cn(
      "h-11 w-full rounded-lg px-4 text-sm font-semibold sm:w-auto",
      active
        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        : "border bg-background text-foreground hover:bg-muted",
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row">
        <Button
          type="button"
          variant={activePanel === "quizzes" ? "default" : "outline"}
          className={buttonClass(activePanel === "quizzes")}
          onClick={() => setActivePanel("quizzes")}
          aria-pressed={activePanel === "quizzes"}
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          عرض الاختبارات
          <span className="rounded-md bg-background/20 px-1.5 text-xs arabic-numbers">{quizzes.length}</span>
        </Button>

        <Button
          type="button"
          variant={activePanel === "summaries" ? "default" : "outline"}
          className={buttonClass(activePanel === "summaries")}
          onClick={() => setActivePanel("summaries")}
          aria-pressed={activePanel === "summaries"}
        >
          <BookOpenText className="h-4 w-4" aria-hidden />
          ملخصات المادة
          <span className="rounded-md bg-background/20 px-1.5 text-xs arabic-numbers">{summaries.length}</span>
        </Button>
      </div>

      {activePanel === "quizzes" ? (
        <SubjectQuizzesPanel quizzes={quizzes} subjectId={subjectId} majorId={majorId} />
      ) : (
        <SubjectStudySummaries summaries={summaries} basePath={basePath} subjectId={subjectId} majorId={majorId} />
      )}
    </div>
  );
}
