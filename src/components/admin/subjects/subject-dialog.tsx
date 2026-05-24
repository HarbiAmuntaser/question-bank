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
import { createSubjectAction, updateSubjectAction } from "@/app/admin/subjects/actions";
import { useToast } from "@/hooks/use-toast";

type UniversityOption = { id: string; name: string; code: string | null };
type MajorOption = { id: string; name: string; code: string | null };
type SubjectDialogSubject = {
  id: string;
  majorId?: string;
  name: string;
  code: string | null;
  creditHours: number | null;
  semester: number | null;
  year: number | null;
  description: string | null;
  isActive: boolean;
  major?: {
    university?: { id: string } | null;
  } | null;
};

const NONE = "__none__";

interface SubjectDialogProps {
  children?: React.ReactNode;
  subject?: SubjectDialogSubject;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SubjectDialog({ children, subject, open, onOpenChange }: SubjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [majors, setMajors] = useState<MajorOption[]>([]);

  // حالات الاختيار
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>(NONE);
  const [selectedMajorId, setSelectedMajorId] = useState<string>(NONE);

  const { toast } = useToast();

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  // تحميل الجامعات عند فتح الحوار + تهيئة القيم الافتراضية في حالة التعديل
  useEffect(() => {
    const loadUniversities = async () => {
      try {
        const res = await fetch(
          `/api/v1/admin/universities?page=1&pageSize=1000&sortBy=name&sortOrder=asc`,
          { next: { revalidate: 3600, tags: ["universities"] } }
        );
        if (!res.ok) throw new Error("universities_fetch_failed");
        const payload = await res.json();
        const rows: UniversityOption[] = (payload?.data ?? []).map((u: any) => ({
          id: String(u.id),
          name: String(u.name),
          code: u.code ?? null,
        }));
        setUniversities(rows);

        // لو تعديل: اضبط الجامعة والتخصص مبدئياً
        if (subject?.major?.university?.id) {
          const uniId = subject.major.university.id;
          setSelectedUniversityId(uniId);
          // وحمّل تخصصات الجامعة المختارة
          await loadMajorsByUniversity(uniId, subject?.majorId ?? NONE);
        } else {
          // إنشاء جديد: لا شيء محدد
          setSelectedUniversityId(NONE);
          setMajors([]);
          setSelectedMajorId(NONE);
        }
      } catch (e) {
        // في أسوأ الحالات اترك القوائم فارغة
        setUniversities([]);
      }
    };

    if (dialogOpen) {
      void loadUniversities();
    } else {
      // عند إغلاق الدialog نظّف الحالة
      setUniversities([]);
      setMajors([]);
      setSelectedUniversityId(NONE);
      setSelectedMajorId(NONE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  // دالة جلب تخصصات جامعة معينة
  const loadMajorsByUniversity = async (universityId: string, preselectMajorId: string = NONE) => {
    if (!universityId || universityId === NONE) {
      setMajors([]);
      setSelectedMajorId(NONE);
      return;
    }
    try {
      const usp = new URLSearchParams({
        page: "1",
        pageSize: "1000",
        sortBy: "name",
        sortOrder: "asc",
        universityId,
      });
      const res = await fetch(`/api/v1/admin/majors?${usp.toString()}`, {
        next: { revalidate: 120, tags: ["majors"] },
      });
      if (!res.ok) throw new Error("majors_fetch_failed");
      const payload = await res.json();
      const rows: MajorOption[] = (payload?.data ?? []).map((m: any) => ({
        id: String(m.id),
        name: String(m.name),
        code: m.code ?? null,
      }));
      setMajors(rows);

      // إن كان لدينا تخصص محدد مسبقاً (في وضع التعديل) وتابع لنفس الجامعة
      if (preselectMajorId !== NONE && rows.some((x) => x.id === preselectMajorId)) {
        setSelectedMajorId(preselectMajorId);
      } else {
        setSelectedMajorId(NONE);
      }
    } catch {
      setMajors([]);
      setSelectedMajorId(NONE);
    }
  };

  // عند تغيير الجامعة من الـ Select
  const handleUniversityChange = (val: string) => {
    setSelectedUniversityId(val);
    // إعادة تحميل تخصصات الجامعة الجديدة وتصفير الخيار الحالي
    void loadMajorsByUniversity(val, NONE);
  };

  const handleSubmit = async (formData: FormData) => {
    if (!selectedUniversityId || selectedUniversityId === NONE) {
      toast({ title: "خطأ", description: "يرجى اختيار الجامعة", variant: "destructive" });
      return;
    }
    if (!selectedMajorId || selectedMajorId === NONE) {
      toast({ title: "خطأ", description: "يرجى اختيار التخصص", variant: "destructive" });
      return;
    }

    // أضف الـ majorId فقط (الجامعة تُستنتج من التخصص)
    formData.append("majorId", selectedMajorId);

    startTransition(async () => {
      try {
        let result: { success: boolean; message: string };
        if (subject) {
          result = await updateSubjectAction(subject.id, formData);
        } else {
          result = await createSubjectAction(formData);
        }

        if (result.success) {
          toast({ title: "نجح", description: result.message });
          setDialogOpen(false);
          // تنظيف
          setSelectedUniversityId(NONE);
          setSelectedMajorId(NONE);
          setMajors([]);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{subject ? "تعديل المقرر" : "إضافة مقرر"}</DialogTitle>
          <DialogDescription>
            {subject ? "قم بتحديث معلومات المقرر أدناه." : "أضف مقرراً جديداً إلى النظام."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* الجامعة */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">الجامعة</Label>
              <div className="col-span-3">
                <Select value={selectedUniversityId} onValueChange={handleUniversityChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الجامعة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE} disabled>
                      اختر الجامعة
                    </SelectItem>
                    {universities.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* التخصص (يعتمد على الجامعة) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">التخصص</Label>
              <div className="col-span-3">
                <Select
                  value={selectedMajorId}
                  onValueChange={setSelectedMajorId}
                  required
                  // عطّل الاختيار حتى نختار جامعة
                  disabled={selectedUniversityId === NONE}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التخصص" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE} disabled>
                      {selectedUniversityId === NONE ? "اختر الجامعة أولاً" : "اختر التخصص"}
                    </SelectItem>
                    {majors.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* باقي الحقول */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                اسم المقرر
              </Label>
              <Input id="name" name="name" defaultValue={subject?.name} className="col-span-3" required />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                رمز المقرر
              </Label>
              <Input id="code" name="code" defaultValue={subject?.code ?? ""} className="col-span-3" placeholder="مثال: CS101" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="creditHours" className="text-right col-span-2">
                  الساعات المعتمدة
                </Label>
                <Input
                  id="creditHours"
                  name="creditHours"
                  type="number"
                  min="1"
                  max="6"
                  defaultValue={subject?.creditHours ?? ""}
                  className="col-span-2"
                  placeholder="3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="semester" className="text-right col-span-2">
                  الفصل الدراسي
                </Label>
                <Input
                  id="semester"
                  name="semester"
                  type="number"
                  min="1"
                  max="3"
                  defaultValue={subject?.semester ?? ""}
                  className="col-span-2"
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">
                السنة الدراسية
              </Label>
              <Input id="year" name="year" type="number" min="1" max="6" defaultValue={subject?.year ?? ""} className="col-span-3" placeholder="1" />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                الوصف
              </Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={subject?.description ?? ""}
                className="col-span-3"
                placeholder="وصف المقرر وأهدافه التعليمية..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                نشط
              </Label>
              <Switch id="isActive" name="isActive" defaultChecked={subject?.isActive ?? true} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || selectedUniversityId === NONE || selectedMajorId === NONE}>
              {isPending ? "جاري الحفظ..." : subject ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
