// src/components/admin/chapters/chapter-dialog.tsx
"use client";

import type React from "react";
import { useEffect, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createChapterAction, updateChapterAction } from "@/app/admin/chapters/actions";
import { useToast } from "@/hooks/use-toast";
import type { ChapterWithRelations } from "@/types";

// خيارات بسيطة للـ Select
type UniversityOption = { id: string; name: string; code: string | null };
type MajorOption = { id: string; name: string; code: string | null; universityId: string };
type SubjectOption = { id: string; name: string; code: string | null; majorId: string };

interface ChapterDialogProps {
  children?: React.ReactNode;
  chapter?: ChapterWithRelations;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChapterDialog({ children, chapter, open, onOpenChange }: ChapterDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // القوائم
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [majors, setMajors] = useState<MajorOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  // القيم المختارة
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>(chapter?.subjectId || "");

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange : setIsOpen;

  // Helpers للطلبات (عميل = نسبي)
  async function loadUniversities() {
    try {
      const qs = new URLSearchParams({
        page: "1",
        pageSize: "1000",
        sortBy: "name",
        sortOrder: "asc",
      });
      const res = await fetch(`/api/v1/admin/universities?${qs.toString()}`, {
        next: { revalidate: 3600, tags: ["universities"] },
      });
      if (!res.ok) throw new Error("failed");
      const payload = await res.json();
      const items: UniversityOption[] = (payload?.data ?? []).map((u: any) => ({
        id: u.id,
        name: u.name,
        code: u.code ?? null,
      }));
      setUniversities(items);
    } catch {
      setUniversities([]);
    }
  }

  async function loadMajorsByUniversity(universityId: string) {
    if (!universityId) {
      setMajors([]);
      return;
    }
    try {
      const qs = new URLSearchParams({
        page: "1",
        pageSize: "1000",
        sortBy: "name",
        sortOrder: "asc",
        universityId,
      });
      const res = await fetch(`/api/v1/admin/majors?${qs.toString()}`, {
        next: { revalidate: 3600, tags: ["majors"] },
      });
      if (!res.ok) throw new Error("failed");
      const payload = await res.json();
      const items: MajorOption[] = (payload?.data ?? []).map((m: any) => ({
        id: m.id,
        name: m.name,
        code: m.code ?? null,
        universityId,
      }));
      setMajors(items);
    } catch {
      setMajors([]);
    }
  }

  async function loadSubjectsByMajor(majorId: string) {
    if (!majorId) {
      setSubjects([]);
      return;
    }
    try {
      const qs = new URLSearchParams({
        page: "1",
        pageSize: "1000",
        sortBy: "name",
        sortOrder: "asc",
        majorId,
      });
      const res = await fetch(`/api/v1/admin/subjects?${qs.toString()}`, {
        next: { revalidate: 3600, tags: ["subjects"] },
      });
      if (!res.ok) throw new Error("failed");
      const payload = await res.json();
      const items: SubjectOption[] = (payload?.data ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code ?? null,
        majorId,
      }));
      setSubjects(items);
    } catch {
      setSubjects([]);
    }
  }

  // فتح الدايالوج: تحميل الجامعات + لو تحرير نعمل prefill للسلسلة
  useEffect(() => {
    if (!dialogOpen) return;

    // حمّل الجامعات أولاً
    (async () => {
      await loadUniversities();

      // Prefill في حالة التعديل
      if (chapter?.subject) {
        const uniId = chapter.subject?.major?.university?.id ?? "";
        const majId = chapter.subject?.majorId ?? "";
        const subId = chapter.subjectId ?? "";

        if (uniId) {
          setSelectedUniversity(uniId);
          await loadMajorsByUniversity(uniId);
        } else {
          setSelectedUniversity("");
          setMajors([]);
        }

        if (majId) {
          setSelectedMajor(majId);
          await loadSubjectsByMajor(majId);
        } else {
          setSelectedMajor("");
          setSubjects([]);
        }

        if (subId) {
          setSelectedSubject(subId);
        } else {
          setSelectedSubject("");
        }
      } else {
        // إنشاء جديد
        setSelectedUniversity("");
        setSelectedMajor("");
        setSelectedSubject("");
        setMajors([]);
        setSubjects([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  // عند تغيير الجامعة
  const handleSelectUniversity = async (val: string) => {
    setSelectedUniversity(val);
    setSelectedMajor("");
    setSelectedSubject("");
    setSubjects([]);
    await loadMajorsByUniversity(val);
  };

  // عند تغيير التخصص
  const handleSelectMajor = async (val: string) => {
    setSelectedMajor(val);
    setSelectedSubject("");
    await loadSubjectsByMajor(val);
  };

  // Submit
  const handleSubmit = async (formData: FormData) => {
    if (!selectedSubject) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار المقرر",
        variant: "destructive",
      });
      return;
    }

    formData.append("subjectId", selectedSubject);

    startTransition(async () => {
      try {
        let result;
        if (chapter) {
          result = await updateChapterAction(chapter.id, formData);
        } else {
          result = await createChapterAction(formData);
        }

        if (result.success) {
          toast({ title: "نجح", description: result.message });
          setDialogOpen(false);
          // إعادة تهيئة الحقول
          setSelectedUniversity("");
          setSelectedMajor("");
          setSelectedSubject("");
          setMajors([]);
          setSubjects([]);
        } else {
          toast({ title: "خطأ", description: result.message, variant: "destructive" });
        }
      } catch {
        toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{chapter ? "تعديل الفصل" : "إضافة فصل"}</DialogTitle>
          <DialogDescription>
            {chapter ? "قم بتحديث معلومات الفصل أدناه." : "أضف فصلاً جديداً إلى النظام."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* الجامعة */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">الجامعة</Label>
              <div className="col-span-3">
                <Select value={selectedUniversity} onValueChange={handleSelectUniversity}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الجامعة" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* التخصص */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">التخصص</Label>
              <div className="col-span-3">
                <Select
                  value={selectedMajor}
                  onValueChange={handleSelectMajor}
                  disabled={!selectedUniversity || majors.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedUniversity ? "اختر التخصص" : "اختر الجامعة أولاً"} />
                  </SelectTrigger>
                  <SelectContent>
                    {majors.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* المقرر */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">المقرر</Label>
              <div className="col-span-3">
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                  disabled={!selectedMajor || subjects.length === 0}
                  required
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        selectedMajor
                          ? subjects.length > 0
                            ? "اختر المقرر"
                            : "لا توجد مقررات لهذا التخصص"
                          : "اختر التخصص أولاً"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* اسم الفصل */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                اسم الفصل
              </Label>
              <Input id="name" name="name" defaultValue={chapter?.name} className="col-span-3" required />
            </div>

            {/* رقم الفصل */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chapterNumber" className="text-right">
                رقم الفصل
              </Label>
              <Input
                id="chapterNumber"
                name="chapterNumber"
                type="number"
                min="1"
                defaultValue={chapter?.chapterNumber ?? ""}
                className="col-span-3"
                placeholder="1"
              />
            </div>

            {/* الوصف */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                الوصف
              </Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={chapter?.description ?? ""}
                className="col-span-3"
                placeholder="وصف محتوى الفصل..."
                rows={3}
              />
            </div>

            {/* الأهداف التعليمية */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="learningObjectives" className="text-right pt-2">
                الأهداف التعليمية
              </Label>
              <Textarea
                id="learningObjectives"
                name="learningObjectives"
                defaultValue={chapter?.learningObjectives?.join("\n") ?? ""}
                className="col-span-3"
                placeholder="اكتب كل هدف في سطر منفصل..."
                rows={4}
              />
            </div>

            {/* الحالة */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                نشط
              </Label>
              <Switch id="isActive" name="isActive" defaultChecked={chapter?.isActive ?? true} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !selectedSubject}>
              {isPending ? "جاري الحفظ..." : chapter ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
