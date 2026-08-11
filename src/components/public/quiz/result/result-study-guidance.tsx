"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, FileText, Lightbulb, Tags } from "lucide-react";

import type { QuestionOption, QuestionWithOptions, QuizAnswer, QuizWithQuestions } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UiResult } from "./use-quiz-results";

export type ResultStudySummaryReference = {
  id: string;
  title: string;
  excerpt: string | null;
  accessType: "inherit" | "free" | "paid";
  chapter: { id: string; name: string; chapterNumber: number | null } | null;
  hasReadableContent: boolean;
  hasPdf: boolean;
  href: string | null;
};

type GuidanceQuestion = QuestionWithOptions & {
  chapterId?: string | null;
  chapter?: { id: string; name: string; chapterNumber: number | null } | null;
};

type GuidanceItem = {
  question: GuidanceQuestion;
  questionNumber: number;
  isAnswered: boolean;
  isCorrect: boolean;
};

type ChapterFocus = {
  key: string;
  chapterId: string | null;
  label: string;
  total: number;
  missed: number;
  wrong: number;
  unanswered: number;
  questionNumbers: number[];
  tags: Array<{ name: string; count: number }>;
};

function optionToBoolean(optionText: string | null | undefined) {
  const value = String(optionText ?? "").trim().toLowerCase();
  if (["true", "t", "صح", "صحيح", "صواب"].includes(value)) return true;
  if (["false", "f", "خطأ", "خطا", "خطاء", "غير صحيح", "غلط"].includes(value)) return false;
  return null;
}

function getSelectedOptionId(question: GuidanceQuestion, answer: QuizAnswer | undefined) {
  if (!answer) return "";

  if (question.questionType === "multiple_choice") {
    return answer.selectedOptionIds?.[0] ?? "";
  }

  if (question.questionType === "true_false") {
    if (typeof answer.booleanAnswer === "boolean") {
      return question.options.find((option) => optionToBoolean(option.optionText) === answer.booleanAnswer)?.id ?? "";
    }
    return answer.selectedOptionIds?.[0] ?? "";
  }

  return "";
}

function isAnswered(question: GuidanceQuestion, answer: QuizAnswer | undefined) {
  if (question.questionType === "multiple_choice") return Boolean(getSelectedOptionId(question, answer));
  if (question.questionType === "true_false") {
    return typeof answer?.booleanAnswer === "boolean" || Boolean(getSelectedOptionId(question, answer));
  }
  return Boolean(answer?.textAnswer?.trim());
}

function isCorrectAnswer(question: GuidanceQuestion, answer: QuizAnswer | undefined) {
  if (!answer) return false;

  const correctOption: QuestionOption | undefined = question.options.find((option) => option.isCorrect);

  if (question.questionType === "multiple_choice") {
    const selectedOptionId = getSelectedOptionId(question, answer);
    return Boolean(selectedOptionId && correctOption && selectedOptionId === correctOption.id);
  }

  if (question.questionType === "true_false") {
    const correctValue = optionToBoolean(correctOption?.optionText);
    return correctValue !== null
      ? answer.booleanAnswer === correctValue
      : Boolean(getSelectedOptionId(question, answer) && correctOption && getSelectedOptionId(question, answer) === correctOption.id);
  }

  return Boolean(answer.textAnswer?.trim());
}

function chapterLabel(question: GuidanceQuestion) {
  const chapter = question.chapter;
  if (chapter?.name) {
    return typeof chapter.chapterNumber === "number" ? `الفصل ${chapter.chapterNumber}: ${chapter.name}` : chapter.name;
  }
  return "محور عام من الاختبار";
}

function topEntries(map: Map<string, number>, limit: number) {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ar"))
    .slice(0, limit);
}

function buildGuidanceItems(quiz: QuizWithQuestions, answers: Record<string, QuizAnswer>): GuidanceItem[] {
  return quiz.questions.map((question, index) => {
    const guidanceQuestion = question as GuidanceQuestion;
    const answer = answers[guidanceQuestion.id];
    const answered = isAnswered(guidanceQuestion, answer);

    return {
      question: guidanceQuestion,
      questionNumber: index + 1,
      isAnswered: answered,
      isCorrect: answered ? isCorrectAnswer(guidanceQuestion, answer) : false,
    };
  });
}

function buildChapterFocus(items: GuidanceItem[]): ChapterFocus[] {
  const groups = new Map<
    string,
    ChapterFocus & {
      tagCounts: Map<string, number>;
    }
  >();

  for (const item of items) {
    const chapterId = item.question.chapter?.id ?? item.question.chapterId ?? null;
    const key = chapterId ?? "__general__";
    const existing =
      groups.get(key) ??
      {
        key,
        chapterId,
        label: chapterLabel(item.question),
        total: 0,
        missed: 0,
        wrong: 0,
        unanswered: 0,
        questionNumbers: [],
        tags: [],
        tagCounts: new Map<string, number>(),
      };

    existing.total += 1;

    if (!item.isCorrect) {
      existing.missed += 1;
      existing.questionNumbers.push(item.questionNumber);
      if (!item.isAnswered) existing.unanswered += 1;
      else existing.wrong += 1;

      for (const tag of item.question.tags ?? []) {
        const normalized = String(tag).trim();
        if (normalized) existing.tagCounts.set(normalized, (existing.tagCounts.get(normalized) ?? 0) + 1);
      }
    }

    groups.set(key, existing);
  }

  return Array.from(groups.values())
    .filter((group) => group.missed > 0)
    .map(({ tagCounts, ...group }) => ({ ...group, tags: topEntries(tagCounts, 3) }))
    .sort((a, b) => b.missed - a.missed || b.missed / b.total - a.missed / a.total || a.label.localeCompare(b.label, "ar"))
    .slice(0, 3);
}

function accessLabel(accessType: ResultStudySummaryReference["accessType"]) {
  if (accessType === "free") return "مجاني";
  if (accessType === "paid") return "مدفوع";
  return "حسب المادة";
}

function difficultyLabel(value: GuidanceQuestion["difficultyLevel"]) {
  if (value === "easy") return "السهل";
  if (value === "hard") return "المتقدم";
  return "المتوسط";
}

function buildDifficultyNotes(items: GuidanceItem[]) {
  const missedByDifficulty = new Map<GuidanceQuestion["difficultyLevel"], number>();

  for (const item of items) {
    if (item.isCorrect) continue;
    const level = item.question.difficultyLevel;
    missedByDifficulty.set(level, (missedByDifficulty.get(level) ?? 0) + 1);
  }

  return Array.from(missedByDifficulty.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([difficulty, count]) => `${count} من الأخطاء كانت في مستوى ${difficultyLabel(difficulty)}`);
}

function SummaryLink({ summary }: { summary: ResultStudySummaryReference }) {
  return (
    <div className="rounded-lg border bg-background/80 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="font-semibold leading-tight text-foreground">{summary.title}</div>
          {summary.excerpt ? <p className="line-clamp-2 text-sm leading-relaxed text-foreground/75">{summary.excerpt}</p> : null}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="rounded-md">{accessLabel(summary.accessType)}</Badge>
            {summary.hasReadableContent ? <Badge variant="secondary" className="rounded-md">قراءة</Badge> : null}
            {summary.hasPdf ? <Badge variant="outline" className="rounded-md">PDF</Badge> : null}
          </div>
        </div>

        {summary.href ? (
          <Button asChild variant="outline" size="sm" className="shrink-0 bg-transparent">
            <Link href={summary.href}>فتح الملخص</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ResultStudyGuidance({
  quiz,
  current,
  completedAnswers,
  summaries,
  reviewWrongHref,
}: {
  quiz: QuizWithQuestions;
  current: UiResult;
  completedAnswers: Record<string, QuizAnswer> | null;
  summaries: ResultStudySummaryReference[];
  reviewWrongHref: string;
}) {
  if (!completedAnswers) {
    return (
      <Card className="no-print border bg-card/95 shadow-sm">
        <CardHeader className="p-5 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-primary" aria-hidden />
            توجيهات المراجعة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          <p className="text-sm leading-relaxed text-foreground/75">
            لا يمكن قراءة تفاصيل إجابات هذه المحاولة من هذا الجهاز، لذلك تظهر النتيجة فقط بدون تحليل تفصيلي للمحاور.
          </p>
        </CardContent>
      </Card>
    );
  }

  const items = buildGuidanceItems(quiz, completedAnswers);
  const focusAreas = buildChapterFocus(items);
  const missedItems = items.filter((item) => !item.isCorrect);
  const missedTagCounts = new Map<string, number>();

  for (const item of missedItems) {
    for (const tag of item.question.tags ?? []) {
      const normalized = String(tag).trim();
      if (normalized) missedTagCounts.set(normalized, (missedTagCounts.get(normalized) ?? 0) + 1);
    }
  }

  const topTags = topEntries(missedTagCounts, 6);
  const difficultyNotes = buildDifficultyNotes(items);
  const isPerfect = missedItems.length === 0 && current.totalQuestions > 0;

  return (
    <Card className="no-print border bg-card/95 shadow-sm">
      <CardHeader className="space-y-2 p-5 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden />
          توجيهات المراجعة
        </CardTitle>
        <p className="text-sm leading-relaxed text-foreground/75">
          تحليل خفيف مبني على إجاباتك في هذه المحاولة، ويربطك بالملخصات المتاحة عند وجودها.
        </p>
      </CardHeader>

      <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
        {isPerfect ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-100">
            نتيجتك كاملة في هذه المحاولة. الأفضل الآن تثبيت المستوى بمراجعة سريعة للأسئلة أو تجربة اختبار آخر بنفس المادة.
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {focusAreas.map((area) => {
                const relatedSummaries = summaries
                  .filter((summary) => (area.chapterId ? summary.chapter?.id === area.chapterId : !summary.chapter))
                  .slice(0, 2);

                return (
                  <div key={area.key} className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="rounded-md bg-primary/10 text-primary hover:bg-primary/10">
                            أولوية مراجعة
                          </Badge>
                          <span className="font-semibold text-foreground">{area.label}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/75">
                          تحتاج مراجعة هذا المحور لأن لديك {area.missed} من {area.total} أسئلة غير صحيحة أو غير مجابة.
                        </p>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <Badge variant="outline" className="rounded-md">أسئلة: {area.questionNumbers.join("، ")}</Badge>
                          {area.wrong ? <Badge variant="outline" className="rounded-md">خاطئة: {area.wrong}</Badge> : null}
                          {area.unanswered ? <Badge variant="outline" className="rounded-md">غير مجابة: {area.unanswered}</Badge> : null}
                        </div>
                        {area.tags.length ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Tags className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                            {area.tags.map((tag) => (
                              <Badge key={tag.name} variant="secondary" className="rounded-md">
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <Button asChild variant="outline" size="sm" className="shrink-0 bg-transparent">
                        <Link href={reviewWrongHref}>
                          مراجعة الأخطاء
                          <ArrowLeft className="h-4 w-4" aria-hidden />
                        </Link>
                      </Button>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <BookOpen className="h-4 w-4 text-primary" aria-hidden />
                        مصادر مراجعة مقترحة
                      </div>
                      {relatedSummaries.length ? (
                        <div className="grid gap-2">
                          {relatedSummaries.map((summary) => (
                            <SummaryLink key={summary.id} summary={summary} />
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-lg border border-dashed bg-background/70 p-3 text-sm leading-relaxed text-foreground/70">
                          لا يوجد ملخص منشور مرتبط بهذا المحور حاليًا. يمكن الاعتماد على شرح السؤال ومراجعة الأسئلة الخاطئة.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {topTags.length || difficultyNotes.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {topTags.length ? (
                  <div className="rounded-lg border bg-background/70 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Tags className="h-4 w-4 text-primary" aria-hidden />
                      وسوم تحتاج انتباه
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {topTags.map((tag) => (
                        <Badge key={tag.name} variant="outline" className="rounded-md">
                          {tag.name} × {tag.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {difficultyNotes.length ? (
                  <div className="rounded-lg border bg-background/70 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-primary" aria-hidden />
                      ملاحظة على مستوى الأسئلة
                    </div>
                    <ul className="space-y-1 text-sm leading-relaxed text-foreground/75">
                      {difficultyNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
