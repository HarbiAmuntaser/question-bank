"use client";

import type React from "react";
import { useEffect, useState, useTransition } from "react";

import { createMajorAction, updateMajorAction } from "@/app/admin/majors/actions";
import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { DEGREE_TYPE_OPTIONS, normalizeDegreeType } from "@/lib/degree-types";
import type { MajorWithRelations } from "@/types";

interface MajorDialogProps {
  children?: React.ReactNode;
  major?: MajorWithRelations;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MajorDialog({ children, major, open, onOpenChange }: MajorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedUniversity, setSelectedUniversity] = useState(major?.universityId || "");
  const { toast } = useToast();

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  useEffect(() => {
    if (dialogOpen) setSelectedUniversity(major?.universityId || "");
  }, [dialogOpen, major?.universityId]);

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

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{major ? "تعديل التخصص" : "إضافة تخصص"}</DialogTitle>
          <DialogDescription>
            {major ? "قم بتحديث معلومات التخصص أدناه." : "أضف تخصصاً جديداً إلى النظام."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">الجامعة</Label>
              <div className="col-span-3">
                <AdminLookupCombobox
                  type="university"
                  value={selectedUniversity}
                  onValueChange={setSelectedUniversity}
                  placeholder="ابحث عن جامعة"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                اسم التخصص
              </Label>
              <Input id="name" name="name" defaultValue={major?.name} className="col-span-3" required />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                رمز التخصص
              </Label>
              <Input id="code" name="code" defaultValue={major?.code || ""} className="col-span-3" placeholder="مثال: CS" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="degreeType" className="text-right">
                نوع الدرجة
              </Label>
              <Select name="degreeType" defaultValue={normalizeDegreeType(major?.degreeType)}>
                <SelectTrigger id="degreeType" className="col-span-3">
                  <SelectValue placeholder="اختر نوع الدرجة" />
                </SelectTrigger>
                <SelectContent>
                  {DEGREE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="durationYears" className="text-right">
                مدة الدراسة (سنوات)
              </Label>
              <Input
                id="durationYears"
                name="durationYears"
                type="number"
                min="1"
                max="10"
                defaultValue={major?.durationYears || ""}
                className="col-span-3"
                placeholder="4"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                نشط
              </Label>
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
