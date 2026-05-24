"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createQuestionAction, updateQuestionAction } from "@/app/admin/questions/actions";
import type { QuestionWithRelations } from "@/types";

import { QuestionCascader } from "./question-dialog/QuestionCascader";
import { MultipleChoiceOptions, type MCOption } from "./question-dialog/MultipleChoiceOptions";
import { TrueFalseAnswer } from "./question-dialog/TrueFalseAnswer";
import { QuestionMetaFields } from "./question-dialog/QuestionMetaFields";

type QuestionType = "multiple_choice" | "true_false";
type DifficultyLevel = "easy" | "medium" | "hard";

type UnivOption = { id: string; name: string; code: string | null };
type MajorOption = { id: string; name: string; code: string | null };
type SubjectOption = { id: string; name: string; code: string | null };
type ChapterOption = { id: string; name: string; chapterNumber: number | null };

interface QuestionDialogProps {
  children?: React.ReactNode;
  question?: QuestionWithRelations;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getArrayField(v: unknown, key: string): unknown[] {
  if (!isRecord(v)) return [];
  const val = v[key];
  return Array.isArray(val) ? val : [];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNullableString(v: unknown): string | null {
  if (typeof v === "string") return v;
  return null;
}

function asNullableNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function normalizeDifficulty(v: unknown): DifficultyLevel {
  const s = typeof v === "string" ? v : "";
  if (s === "easy" || s === "hard") return s;
  return "medium";
}

function normalizeQuestionType(v: unknown): QuestionType {
  return v === "true_false" ? "true_false" : "multiple_choice";
}

export function QuestionDialog({ children, question, open, onOpenChange }: QuestionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  // قوائم
  const [universities, setUniversities] = useState<UnivOption[]>([]);
  const [majors, setMajors] = useState<MajorOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);

  // السلسلة
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState(question?.chapterId ?? "");

  // نوع السؤال
  const [questionType, setQuestionType] = useState<QuestionType>(normalizeQuestionType(question?.questionType));

  // خيارات MC
  const [options, setOptions] = useState<MCOption[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  // إجابة TF
  const [tfAnswer, setTfAnswer] = useState<"true" | "false">("true");

  // Meta fields (لأن Select/Switch ما ينرسلوا تلقائيًا من shadcn)
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(normalizeDifficulty(question?.difficultyLevel));
  const [isActive, setIsActive] = useState<boolean>(question?.isActive ?? true);

  const initialIds = useMemo(() => {
    const u = question?.chapter?.subject?.major?.university?.id;
    const m = question?.chapter?.subject?.major?.id;
    const s = question?.chapter?.subject?.id;
    const c = question?.chapter?.id;
    if (!u || !m || !s || !c) return null;
    return { u, m, s, c };
  }, [question]);

  const loadUniversities = useCallback(async (signal?: AbortSignal): Promise<UnivOption[]> => {
    const res = await fetch(`/api/v1/admin/universities?page=1&pageSize=1000&sortBy=name&sortOrder=asc`, {
      cache: "no-store",
      signal,
    });
    if (!res.ok) return [];
    const payload: unknown = await res.json().catch(() => ({}));
    const rows = getArrayField(payload, "data");

    return rows
      .map((r) => {
        if (!isRecord(r)) return null;
        return {
          id: asString(r.id),
          name: asString(r.name),
          code: asNullableString(r.code),
        };
      })
      .filter((x): x is UnivOption => Boolean(x?.id && x.name));
  }, []);

  const loadMajors = useCallback(async (universityId: string, signal?: AbortSignal): Promise<MajorOption[]> => {
    if (!universityId) return [];
    const res = await fetch(
      `/api/v1/admin/majors?page=1&pageSize=1000&sortBy=name&sortOrder=asc&universityId=${encodeURIComponent(universityId)}`,
      { cache: "no-store", signal }
    );
    if (!res.ok) return [];
    const payload: unknown = await res.json().catch(() => ({}));
    const rows = getArrayField(payload, "data");

    return rows
      .map((r) => {
        if (!isRecord(r)) return null;
        return {
          id: asString(r.id),
          name: asString(r.name),
          code: asNullableString(r.code),
        };
      })
      .filter((x): x is MajorOption => Boolean(x?.id && x.name));
  }, []);

  const loadSubjects = useCallback(async (majorId: string, signal?: AbortSignal): Promise<SubjectOption[]> => {
    if (!majorId) return [];
    const res = await fetch(
      `/api/v1/admin/subjects?page=1&pageSize=1000&sortBy=name&sortOrder=asc&majorId=${encodeURIComponent(majorId)}`,
      { cache: "no-store", signal }
    );
    if (!res.ok) return [];
    const payload: unknown = await res.json().catch(() => ({}));
    const rows = getArrayField(payload, "data");

    return rows
      .map((r) => {
        if (!isRecord(r)) return null;
        return {
          id: asString(r.id),
          name: asString(r.name),
          code: asNullableString(r.code),
        };
      })
      .filter((x): x is SubjectOption => Boolean(x?.id && x.name));
  }, []);

  const loadChapters = useCallback(async (subjectId: string, signal?: AbortSignal): Promise<ChapterOption[]> => {
    if (!subjectId) return [];
    const res = await fetch(
      `/api/v1/admin/chapters?page=1&pageSize=1000&sortBy=chapterNumber&sortOrder=asc&subjectId=${encodeURIComponent(subjectId)}`,
      { cache: "no-store", signal }
    );
    if (!res.ok) return [];
    const payload: unknown = await res.json().catch(() => ({}));
    const rows = getArrayField(payload, "data");

    return rows
      .map((r) => {
        if (!isRecord(r)) return null;
        return {
          id: asString(r.id),
          name: asString(r.name),
          chapterNumber: asNullableNumber(r.chapterNumber),
        };
      })
      .filter((x): x is ChapterOption => Boolean(x?.id && x.name));
  }, []);

  // فتح الحوار: init
  useEffect(() => {
    if (!dialogOpen) return;

    const controller = new AbortController();

    const run = async () => {
      try {
        const unis = await loadUniversities(controller.signal);
        setUniversities(unis);

        // defaults
        setDifficultyLevel(normalizeDifficulty(question?.difficultyLevel));
        setIsActive(question?.isActive ?? true);

        const qt: QuestionType = normalizeQuestionType(question?.questionType);
        setQuestionType(qt);

        if (qt === "multiple_choice" && question?.options?.length) {
          const mapped: MCOption[] = question.options
            .slice()
            .sort((a, b) => (a.optionOrder ?? 0) - (b.optionOrder ?? 0))
            .map((o) => ({ text: o.optionText, isCorrect: o.isCorrect }));

          setOptions(mapped.length >= 2 ? mapped : [
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ]);
        }

        if (qt === "true_false") {
          const correct = question?.options?.find((o) => o.isCorrect);
          const v = correct?.optionText?.toLowerCase() === "false" ? "false" : "true";
          setTfAnswer(v);
        }

        if (initialIds) {
          setSelectedUniversity(initialIds.u);
          const ms = await loadMajors(initialIds.u, controller.signal);
          setMajors(ms);

          setSelectedMajor(initialIds.m);
          const ss = await loadSubjects(initialIds.m, controller.signal);
          setSubjects(ss);

          setSelectedSubject(initialIds.s);
          const cs = await loadChapters(initialIds.s, controller.signal);
          setChapters(cs);

          setSelectedChapter(initialIds.c);
        } else {
          setSelectedUniversity("");
          setSelectedMajor("");
          setSelectedSubject("");
          setSelectedChapter("");
          setMajors([]);
          setSubjects([]);
          setChapters([]);
        }
      } catch {
        // ignore
      }
    };

    void run();

    return () => controller.abort();
  }, [dialogOpen, initialIds, loadUniversities, loadMajors, loadSubjects, loadChapters, question]);

  const onChangeUniversity = useCallback(
    async (uId: string) => {
      setSelectedUniversity(uId);
      setSelectedMajor("");
      setSelectedSubject("");
      setSelectedChapter("");
      setMajors([]);
      setSubjects([]);
      setChapters([]);

      if (!uId) return;
      const ms = await loadMajors(uId);
      setMajors(ms);
    },
    [loadMajors]
  );

  const onChangeMajor = useCallback(
    async (mId: string) => {
      setSelectedMajor(mId);
      setSelectedSubject("");
      setSelectedChapter("");
      setSubjects([]);
      setChapters([]);

      if (!mId) return;
      const ss = await loadSubjects(mId);
      setSubjects(ss);
    },
    [loadSubjects]
  );

  const onChangeSubject = useCallback(
    async (sId: string) => {
      setSelectedSubject(sId);
      setSelectedChapter("");
      setChapters([]);

      if (!sId) return;
      const cs = await loadChapters(sId);
      setChapters(cs);
    },
    [loadChapters]
  );

  const validateBeforeSubmit = () => {
    if (!selectedChapter) {
      toast({ title: "خطأ", description: "يرجى اختيار الفصل", variant: "destructive" });
      return false;
    }

 if (questionType === "multiple_choice") {
  const filled = options.filter((o) => o.text.trim().length > 0);
  if (filled.length < 2) {
    toast({ title: "خطأ", description: "الرجاء إدخال خيارين على الأقل.", variant: "destructive" });
    return false;
  }
  const correctCount = filled.filter((o) => o.isCorrect).length;
  if (correctCount !== 1) {
    toast({ title: "خطأ", description: "الرجاء تحديد إجابة صحيحة واحدة فقط.", variant: "destructive" });
    return false;
  }
}


    return true;
  };

  const handleSubmit = async (formData: FormData) => {
    if (!validateBeforeSubmit()) return;

    // ثبت حقول الـ Select/Switch
    formData.set("chapterId", selectedChapter);
    formData.set("questionType", questionType);
    formData.set("difficultyLevel", difficultyLevel);
    formData.set("isActive", isActive ? "true" : "false");

    if (questionType === "multiple_choice") {
      options.forEach((o, idx) => {
        const i = idx + 1;
        const t = o.text.trim();
        if (!t) return;
        formData.set(`option${i}`, t);
        if (o.isCorrect) formData.set(`correct${i}`, "on");
      });
    } else {
      formData.set("option1", "true");
      if (tfAnswer === "true") formData.set("correct1", "on");
      formData.set("option2", "false");
      if (tfAnswer === "false") formData.set("correct2", "on");
    }

    startTransition(async () => {
      const result = question
        ? await updateQuestionAction(question.id, formData)
        : await createQuestionAction(formData);

      if (result.success) {
        toast({ title: "نجح", description: result.message });
        setDialogOpen(false);

        // reset فقط عند الإنشاء
        if (!question) {
          setSelectedUniversity("");
          setSelectedMajor("");
          setSelectedSubject("");
          setSelectedChapter("");
          setQuestionType("multiple_choice");
          setOptions([
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ]);
          setTfAnswer("true");
          setDifficultyLevel("medium");
          setIsActive(true);
        }
      } else {
        toast({ title: "خطأ", description: result.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}

      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "تعديل السؤال" : "إضافة سؤال"}</DialogTitle>
          <DialogDescription>
            {question ? "قم بتحديث معلومات السؤال أدناه." : "أضف سؤالاً جديداً إلى بنك الأسئلة."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <div className="grid gap-6 py-4">
            <QuestionCascader
              universities={universities}
              majors={majors}
              subjects={subjects}
              chapters={chapters}
              selectedUniversity={selectedUniversity}
              selectedMajor={selectedMajor}
              selectedSubject={selectedSubject}
              selectedChapter={selectedChapter}
              onUniversityChange={onChangeUniversity}
              onMajorChange={onChangeMajor}
              onSubjectChange={onChangeSubject}
              onChapterChange={setSelectedChapter}
            />

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="questionText" className="text-right pt-2">
                نص السؤال
              </Label>
              <Textarea
                id="questionText"
                name="questionText"
                defaultValue={question?.questionText ?? ""}
                className="col-span-3"
                placeholder="اكتب نص السؤال هنا..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">نوع السؤال</Label>
              <div className="col-span-3">
                <Select value={questionType} onValueChange={(v) => setQuestionType(v as QuestionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">اختيار متعدد</SelectItem>
                    <SelectItem value="true_false">صح/خطأ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {questionType === "multiple_choice" ? (
              <MultipleChoiceOptions options={options} onChange={setOptions} />
            ) : (
              <TrueFalseAnswer value={tfAnswer} onChange={setTfAnswer} />
            )}

            <QuestionMetaFields
              difficultyLevel={difficultyLevel}
              setDifficultyLevel={setDifficultyLevel}
              isActive={isActive}
              setIsActive={setIsActive}
              defaultPoints={question?.points ?? 1}
              defaultExplanation={question?.explanation ?? null}
              defaultImageUrl={question?.imageUrl ?? null}
              defaultTags={question?.tags?.join(", ") ?? ""}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !selectedChapter}>
              {isPending ? "جاري الحفظ..." : question ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
