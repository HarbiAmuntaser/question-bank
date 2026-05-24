"use client";

import type React from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMajorAction, updateMajorAction } from "@/app/admin/majors/actions";
import { useToast } from "@/hooks/use-toast";
import type { MajorWithRelations } from "@/types";

// نوع مبسّط للأختيار من القائمة
interface UniversitySelectItem { id: string; name: string; code: string | null }

interface MajorDialogProps {
  children?: React.ReactNode;
  major?: MajorWithRelations;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MajorDialog({ children, major, open, onOpenChange }: MajorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [universities, setUniversities] = useState<UniversitySelectItem[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<string>(major?.universityId || "");
  const { toast } = useToast();

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  // تحميل الجامعات من API خفيف
  useEffect(() => {
    if (!dialogOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/universities/select`, { next: { revalidate: 3600, tags: ["universities"] } });
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as { data: UniversitySelectItem[] };
        if (!cancelled) setUniversities(json.data);
      } catch {
        if (!cancelled) setUniversities([]);
      }
    })();
    return () => { cancelled = true; };
  }, [dialogOpen]);

  // مبدئيًا لو تعديل، نضمن اختيار الجامعة الحالية
  useEffect(() => {
    if (major?.universityId) setSelectedUniversity(major.universityId);
  }, [major?.universityId]);

  const handleSubmit = async (formData: FormData) => {
    if (!selectedUniversity) {
      toast({ title: "خطأ", description: "يرجى اختيار الجامعة", variant: "destructive" });
      return;
    }
    formData.set("universityId", selectedUniversity);

    startTransition(async () => {
      try {
        const result = major ? await updateMajorAction(major.id, formData) : await createMajorAction(formData);
        if (result.success) {
          toast({ title: "نجح", description: result.message });
          setDialogOpen(false);
          setSelectedUniversity("");
        } else {
          toast({ title: "خطأ", description: result.message, variant: "destructive" });
        }
      } catch {
        toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
      }
    });
  };

  const uniOptions = useMemo(() => universities, [universities]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{major ? "تعديل التخصص" : "إضافة تخصص"}</DialogTitle>
          <DialogDescription>{major ? "قم بتحديث معلومات التخصص أدناه." : "أضف تخصصاً جديداً إلى النظام."}</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">الجامعة</Label>
              <div className="col-span-3">
                <Select value={selectedUniversity} onValueChange={setSelectedUniversity} required>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الجامعة" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniOptions.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">لا توجد جامعات متاحة</div>
                    ) : (
                      uniOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}{u.code ? ` — ${u.code}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">اسم التخصص</Label>
              <Input id="name" name="name" defaultValue={major?.name} className="col-span-3" required />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">رمز التخصص</Label>
              <Input id="code" name="code" defaultValue={major?.code || ""} className="col-span-3" placeholder="مثال: CS" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="degreeType" className="text-right">نوع الدرجة</Label>
              <Input id="degreeType" name="degreeType" defaultValue={major?.degreeType || ""} className="col-span-3" placeholder="مثال: بكالوريوس" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="durationYears" className="text-right">مدة الدراسة (سنوات)</Label>
              <Input id="durationYears" name="durationYears" type="number" min="1" max="10" defaultValue={major?.durationYears || ""} className="col-span-3" placeholder="4" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">نشط</Label>
              <Switch id="isActive" name="isActive" defaultChecked={major?.isActive ?? true} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !selectedUniversity}>
              {isPending ? "جاري الحفظ..." : major ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}