"use client";

import { useEffect, useState, useTransition } from "react";

import { createExamAction, updateExamAction, type ExamPaperInput } from "@/app/admin/exams/actions";
import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type ExamPaperRecord = {
  id: string;
  subjectId: string;
  year: number;
  term: "first" | "second" | "summer";
  session: "regular" | "makeup" | "special";
  code: string | null;
  source: string | null;
  fileUrl: string | null;
  pagesCount: number | null;
  isPublished: boolean;
  language: "ar" | "en";
  subject?: {
    id: string;
    major?: {
      id: string;
      university?: { id: string };
    };
  } | null;
};

export function ExamPaperDialog({
  open,
  onOpenChange,
  exam,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: ExamPaperRecord | null;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [universityId, setUniversityId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [year, setYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState<ExamPaperInput["term"]>("first");
  const [session, setSession] = useState<ExamPaperInput["session"]>("regular");
  const [code, setCode] = useState("");
  const [source, setSource] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [pagesCount, setPagesCount] = useState<number | undefined>(undefined);
  const [isPublished, setIsPublished] = useState(true);
  const [language, setLanguage] = useState<ExamPaperInput["language"]>("ar");

  useEffect(() => {
    if (!open) return;

    setUniversityId(exam?.subject?.major?.university?.id ?? "");
    setMajorId(exam?.subject?.major?.id ?? "");
    setSubjectId(exam?.subjectId ?? "");
    setYear(exam?.year ?? new Date().getFullYear());
    setTerm(exam?.term ?? "first");
    setSession(exam?.session ?? "regular");
    setCode(exam?.code ?? "");
    setSource(exam?.source ?? "");
    setFileUrl(exam?.fileUrl ?? "");
    setPagesCount(exam?.pagesCount ?? undefined);
    setIsPublished(exam?.isPublished ?? true);
    setLanguage(exam?.language ?? "ar");
  }, [open, exam]);

  const handleUniversityChange = (value: string) => {
    setUniversityId(value);
    setMajorId("");
    setSubjectId("");
  };

  const handleMajorChange = (value: string) => {
    setMajorId(value);
    setSubjectId("");
  };

  function submit() {
    if (!subjectId) {
      toast({ title: "خطأ", description: "يرجى اختيار المقرر", variant: "destructive" });
      return;
    }

    const payload: ExamPaperInput = {
      subjectId,
      year: Number(year) || new Date().getFullYear(),
      term,
      session,
      code: code.trim() || null,
      source: source.trim() || null,
      fileUrl: fileUrl.trim() || null,
      pagesCount: pagesCount ? Number(pagesCount) : null,
      isPublished: Boolean(isPublished),
      language,
    };

    startTransition(async () => {
      const res = exam?.id ? await updateExamAction(exam.id, payload) : await createExamAction(payload);
      if (!res.success) {
        toast({ title: "خطأ", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "نجح", description: res.message });
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{exam ? "تعديل ورقة اختبار" : "إضافة ورقة اختبار"}</DialogTitle>
          <DialogDescription>
            {exam ? "قم بتحديث بيانات الورقة." : "أدخل بيانات الورقة الجديدة."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>الجامعة</Label>
              <AdminLookupCombobox
                type="university"
                value={universityId}
                onValueChange={handleUniversityChange}
                placeholder="ابحث عن جامعة"
              />
            </div>

            <div className="space-y-2">
              <Label>التخصص</Label>
              <AdminLookupCombobox
                type="major"
                value={majorId}
                onValueChange={handleMajorChange}
                universityId={universityId}
                disabled={!universityId}
                placeholder={universityId ? "ابحث عن تخصص" : "اختر الجامعة أولاً"}
              />
            </div>

            <div className="space-y-2">
              <Label>المقرر</Label>
              <AdminLookupCombobox
                type="subject"
                value={subjectId}
                onValueChange={setSubjectId}
                majorId={majorId}
                disabled={!majorId}
                placeholder={majorId ? "ابحث عن مقرر" : "اختر التخصص أولاً"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>السنة</Label>
              <Input type="number" value={year} onChange={(event) => setYear(Number(event.target.value) || year)} />
            </div>
            <div className="space-y-2">
              <Label>الفصل/الترم</Label>
              <Select value={term} onValueChange={(value) => setTerm(value as ExamPaperInput["term"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">الأول</SelectItem>
                  <SelectItem value="second">الثاني</SelectItem>
                  <SelectItem value="summer">الصيفي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الجلسة</Label>
              <Select value={session} onValueChange={(value) => setSession(value as ExamPaperInput["session"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">عادي</SelectItem>
                  <SelectItem value="makeup">بديل</SelectItem>
                  <SelectItem value="special">خاص</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>الكود (اختياري)</Label>
              <Input value={code} onChange={(event) => setCode(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>المصدر (اختياري)</Label>
              <Input value={source} onChange={(event) => setSource(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>رابط الملف (اختياري)</Label>
              <Input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>عدد الصفحات (اختياري)</Label>
              <Input
                type="number"
                value={pagesCount ?? ""}
                onChange={(event) => setPagesCount(event.target.value ? Number(event.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>اللغة</Label>
              <Select value={language} onValueChange={(value) => setLanguage(value as ExamPaperInput["language"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="isPublished" checked={isPublished} onCheckedChange={(checked) => setIsPublished(Boolean(checked))} />
                <Label htmlFor="isPublished">منشور</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button onClick={submit} disabled={isPending}>
              {isPending ? "جاري الحفظ..." : exam ? "تحديث" : "إنشاء"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
