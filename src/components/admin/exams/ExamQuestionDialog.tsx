// src/components/admin/exams/ExamQuestionDialog.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { RichQuestionContent } from "@/components/shared/rich-question-content";
import { useToast } from "@/hooks/use-toast";
import { createExamQuestionAction, updateExamQuestionAction, type ExamQuestionPayload } from "@/app/admin/exams/actions";

type QuestionSummary = {
  id: string;
  questionText: string;
  difficultyLevel: "easy" | "medium" | "hard";
  points: number;
  chapter?: {
    name?: string | null;
    subject?: { name?: string | null };
  };
};

type ExamQuestionRecord = {
  id: string;
  questionId: string;
  questionNumber: number;
  page: number | null;
  points: number;
  question?: QuestionSummary | null;
};

export function ExamQuestionDialog({
  open,
  onOpenChange,
  examId,
  subjectId,
  question,
  defaultOrder = 1,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  examId: string;
  subjectId?: string;
  question?: ExamQuestionRecord | null;
  defaultOrder?: number;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [questionId, setQuestionId] = useState<string>("");
  const [questionNumber, setQuestionNumber] = useState<number>(defaultOrder);
  const [page, setPage] = useState<string>("");
  const [points, setPoints] = useState<string>("1");
  const [search, setSearch] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionOptions, setQuestionOptions] = useState<QuestionSummary[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuestionId(question?.questionId ?? "");
    setQuestionNumber(question?.questionNumber ?? defaultOrder);
    setPage(question?.page ? String(question.page) : "");
    setPoints(question?.points ? String(question.points) : "1");
    setSearch("");
  }, [open, question, defaultOrder]);

  useEffect(() => {
    if (!open || !subjectId) return;
    let active = true;
    setLoadingQuestions(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/v1/admin/questions?page=1&pageSize=100&sortBy=createdAt&sortOrder=desc&subjectId=${subjectId}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        setQuestionOptions(data?.data ?? []);
      } catch {
        if (active) setQuestionOptions([]);
      } finally {
        if (active) setLoadingQuestions(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, subjectId]);

  useEffect(() => {
    if (!question || !question.question) return;
    setQuestionOptions((prev) => {
      if (prev.some((q) => q.id === question.question?.id)) return prev;
      return [question.question as QuestionSummary, ...prev];
    });
  }, [question]);

  const filteredQuestions = useMemo(() => {
    if (!search.trim()) return questionOptions;
    const term = search.trim().toLowerCase();
    return questionOptions.filter((q) => q.questionText?.toLowerCase().includes(term));
  }, [questionOptions, search]);

  function handleSubmit() {
    if (!questionId) {
      toast({ title: "تنبيه", description: "يرجى اختيار سؤال لإضافته إلى الورقة.", variant: "destructive" });
      return;
    }
    const payload: ExamQuestionPayload = {
      examPaperId: examId,
      questionId,
      questionNumber: Number(questionNumber) || 1,
      page: page ? Number(page) || null : null,
      points: Number(points) || 1,
    };

    startTransition(async () => {
      const res = question
        ? await updateExamQuestionAction(question.id, {
            questionId: payload.questionId,
            questionNumber: payload.questionNumber,
            page: payload.page,
            points: payload.points ?? undefined,
          })
        : await createExamQuestionAction(payload);
      if (!res.success) {
        toast({ title: "خطأ", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "تم الحفظ", description: res.message });
      onSaved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{question ? "تعديل سؤال الامتحان" : "إضافة سؤال للامتحان"}</DialogTitle>
          <DialogDescription>
            {question
              ? "قم بتعديل بيانات السؤال المرتبط بهذه الورقة."
              : "اختر سؤالاً من القائمة وأضفه إلى الورقة الحالية."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>السؤال</Label>
            {subjectId ? (
              <>
                <Input placeholder="ابحث عن سؤال" value={search} onChange={(e) => setSearch(e.target.value)} />
                <ScrollArea className="h-64 rounded-md border p-2">
                  {loadingQuestions ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">جاري تحميل الأسئلة...</div>
                  ) : filteredQuestions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">لا توجد أسئلة متاحة.</div>
                  ) : (
                    <RadioGroup value={questionId} onValueChange={setQuestionId} className="gap-3">
                      {filteredQuestions.map((q) => (
                        <label
                          key={q.id}
                          className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition hover:bg-muted/40"
                        >
                          <RadioGroupItem value={q.id} className="mt-1" />
                          <div className="space-y-1 text-sm">
                            <RichQuestionContent
                              content={q.questionText}
                              className="max-h-24 overflow-auto font-medium leading-5"
                            />
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {q.chapter?.subject?.name && <span>{q.chapter.subject.name}</span>}
                              {q.chapter?.name && <span>• {q.chapter.name}</span>}
                              <Badge variant="outline">
                                {q.difficultyLevel === "easy"
                                  ? "سهل"
                                  : q.difficultyLevel === "hard"
                                  ? "صعب"
                                  : "متوسط"}
                              </Badge>
                              <span>• {q.points} نقطة</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                </ScrollArea>
              </>
            ) : (
              <Input value={questionId} onChange={(e) => setQuestionId(e.target.value)} placeholder="أدخل معرف السؤال" />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>ترتيب السؤال</Label>
              <Input
                type="number"
                value={questionNumber}
                min={1}
                onChange={(e) => setQuestionNumber(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الصفحة (اختياري)</Label>
              <Input
                type="number"
                value={page}
                min={1}
                onChange={(e) => setPage(e.target.value)}
                placeholder="اكتب رقم الصفحة"
              />
            </div>
            <div className="space-y-2">
              <Label>النقاط</Label>
              <Input
                type="number"
                value={points}
                min={1}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "جاري الحفظ..." : question ? "حفظ التغييرات" : "إضافة السؤال"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
