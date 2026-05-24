// src/components/admin/exams/ExamPaperDialog.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createExamAction, updateExamAction, type ExamPaperInput } from "@/app/admin/exams/actions";

type University = { id: string; name: string };
type Major = { id: string; name: string; universityId: string };
type Subject = { id: string; name: string; majorId: string };

export function ExamPaperDialog({
  open,
  onOpenChange,
  exam, // لو موجود = تعديل
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  exam?: any | null;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [universities, setUniversities] = useState<University[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // فلاتر متسلسلة
  const [universityId, setUniversityId] = useState<string>("");
  const [majorId, setMajorId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");

  // حقول الورقة
  const [year, setYear] = useState<number>(exam?.year ?? new Date().getFullYear());
  const [term, setTerm] = useState<"first" | "second" | "summer">(exam?.term ?? "first");
  const [session, setSession] = useState<"regular" | "makeup" | "special">(exam?.session ?? "regular");
  const [code, setCode] = useState<string>(exam?.code ?? "");
  const [source, setSource] = useState<string>(exam?.source ?? "");
  const [fileUrl, setFileUrl] = useState<string>(exam?.fileUrl ?? "");
  const [pagesCount, setPagesCount] = useState<number | undefined>(exam?.pagesCount ?? undefined);
  const [isPublished, setIsPublished] = useState<boolean>(exam?.isPublished ?? true);
  const [language, setLanguage] = useState<"ar" | "en">(exam?.language ?? "ar");

  // تحميل القوائم
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const [uRes, mRes, sRes] = await Promise.all([
          fetch(`/api/v1/admin/universities?page=1&pageSize=1000&sortBy=name&sortOrder=asc`, { cache: "no-store" }),
          fetch(`/api/v1/admin/majors?page=1&pageSize=2000&sortBy=name&sortOrder=asc`, { cache: "no-store" }),
          fetch(`/api/v1/admin/subjects?page=1&pageSize=4000&sortBy=name&sortOrder=asc`, { cache: "no-store" }),
        ]);
        const [u, m, s] = await Promise.all([uRes.json(), mRes.json(), sRes.json()]);
        if (!alive) return;
        setUniversities(u?.data ?? []);
        setMajors(m?.data ?? []);
        setSubjects(s?.data ?? []);

        if (exam?.subject?.major?.university?.id) setUniversityId(exam.subject.major.university.id);
        if (exam?.subject?.major?.id) setMajorId(exam.subject.major.id);
        if (exam?.subjectId) setSubjectId(exam.subjectId);
      } catch {
        // no-op
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, exam]);

  const filteredMajors = useMemo(
    () => majors.filter((m) => !universityId || m.universityId === universityId),
    [majors, universityId]
  );
  const filteredSubjects = useMemo(
    () => subjects.filter((s) => !majorId || s.majorId === majorId),
    [subjects, majorId]
  );

  // إعادة ضبط التوابع
  useEffect(() => {
    setMajorId("");
    setSubjectId("");
  }, [universityId]);
  useEffect(() => {
    setSubjectId("");
  }, [majorId]);

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
      code: code?.trim() || null,
      source: source?.trim() || null,
      fileUrl: fileUrl?.trim() || null,
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
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{exam ? "تعديل ورقة اختبار" : "إضافة ورقة اختبار"}</DialogTitle>
          <DialogDescription>
            {exam ? "قم بتحديث بيانات الورقة." : "أدخل بيانات الورقة الجديدة."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* كاسكيد */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>الجامعة</Label>
              <Select value={universityId} onValueChange={setUniversityId}>
                <SelectTrigger><SelectValue placeholder="اختر الجامعة" /></SelectTrigger>
                <SelectContent>
                  {universities.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>التخصص</Label>
              <Select value={majorId} onValueChange={setMajorId} disabled={!universityId}>
                <SelectTrigger><SelectValue placeholder={universityId ? "اختر التخصص" : "اختر الجامعة أولاً"} /></SelectTrigger>
                <SelectContent>
                  {filteredMajors.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>المقرر</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!majorId}>
                <SelectTrigger><SelectValue placeholder={majorId ? "اختر المقرر" : "اختر التخصص أولاً"} /></SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* الحقول الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>السنة</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />
            </div>
            <div className="space-y-2">
              <Label>الفصل/الترم</Label>
              <Select value={term} onValueChange={(v) => setTerm(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">الأول</SelectItem>
                  <SelectItem value="second">الثاني</SelectItem>
                  <SelectItem value="summer">الصيفي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الجلسة</Label>
              <Select value={session} onValueChange={(v) => setSession(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">عادي</SelectItem>
                  <SelectItem value="makeup">بديل</SelectItem>
                  <SelectItem value="special">خاص</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>الكود (اختياري)</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>المصدر (اختياري)</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>رابط الملف (اختياري)</Label>
              <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>عدد الصفحات (اختياري)</Label>
              <Input
                type="number"
                value={pagesCount ?? ""}
                onChange={(e) => setPagesCount(e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>اللغة</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-end">
              <div className="flex items-center gap-2">
                <Checkbox id="isPublished" checked={isPublished} onCheckedChange={(c) => setIsPublished(Boolean(c))} />
                <Label htmlFor="isPublished">منشور</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button onClick={submit} disabled={isPending}>
              {isPending ? "جاري الحفظ..." : exam ? "تحديث" : "إنشاء"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
