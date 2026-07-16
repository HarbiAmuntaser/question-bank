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
import {
  createUniversityAction,
  updateUniversityAction,
} from "@/app/admin/universities/actions";
import { useToast } from "@/hooks/use-toast";

// استخدام نفس النوع المصغّر المستخدم في UniversityActions
export interface UniversityMinimal {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  isActive: boolean;

  countryCode: string;
  institutionType: "university" | "school" | "academy";
  visibility?: "country" | "global";
}

interface UniversityDialogProps {
  children?: React.ReactNode;
  university?: UniversityMinimal;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UniversityDialog({
  children,
  university,
  open,
  onOpenChange,
}: UniversityDialogProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedInstitutionType, setSelectedInstitutionType] = useState<"university" | "school" | "academy">(
    university?.institutionType ?? "university",
  );
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setIsOpen;

  useEffect(() => {
    if (dialogOpen) setSelectedInstitutionType(university?.institutionType ?? "university");
  }, [dialogOpen, university?.institutionType]);

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = university
          ? await updateUniversityAction(university.id, formData)
          : await createUniversityAction(formData);

        if (result.success) {
          toast({ title: "نجح", description: result.message });
          setDialogOpen(false);
          // تحديث الجدول فورًا
          window.location.href = "/admin/universities";
        } else {
          toast({
            title: "خطأ",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "خطأ",
          description: "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {university ? "تعديل الجامعة" : "إضافة جامعة"}
          </DialogTitle>
          <DialogDescription>
            {university
              ? "قم بتحديث معلومات الجامعة أدناه."
              : "أضف جامعة جديدة إلى النظام."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 👇 جديد — رمز الدولة */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="countryCode" className="text-right">
                رمز الدولة
              </Label>
              <Input
                id="countryCode"
                name="countryCode"
                defaultValue={university?.countryCode ?? ""}
                className="col-span-3"
                placeholder="SA"
                required
                pattern="[A-Za-z]{2}"
                title="رمز ISO-2 مثل SA, YE, EG"
              />
            </div>

            {/* 👇 جديد — نوع المؤسسة */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="institutionType" className="text-right">
                نوع المؤسسة
              </Label>
              <select
                id="institutionType"
                name="institutionType"
                value={selectedInstitutionType}
                onChange={(event) =>
                  setSelectedInstitutionType(event.target.value as "university" | "school" | "academy")
                }
                className="col-span-3 border rounded-md h-10 px-3 bg-background"
                required
              >
                <option value="university">جامعة</option>
                <option value="school">مدرسة</option>
                <option value="academy">أكاديمية</option>
              </select>
            </div>

            {selectedInstitutionType === "academy" ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="visibility" className="text-right">
                  نطاق الظهور
                </Label>
                <select
                  id="visibility"
                  name="visibility"
                  defaultValue={university?.visibility ?? "country"}
                  className="col-span-3 border rounded-md h-10 px-3 bg-background"
                  required
                >
                  <option value="country">خاص بالدولة الحالية</option>
                  <option value="global">عام لكل الدول</option>
                </select>
              </div>
            ) : (
              <input type="hidden" name="visibility" value="country" />
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                الاسم
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={university?.name ?? ""}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                الرمز
              </Label>
              <Input
                id="code"
                name="code"
                defaultValue={university?.code ?? ""}
                className="col-span-3"
                placeholder="مثال: KSU"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="city" className="text-right">
                المدينة
              </Label>
              <Input
                id="city"
                name="city"
                defaultValue={university?.city ?? ""}
                className="col-span-3"
                placeholder="مثال: الرياض"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="region" className="text-right">
                المنطقة
              </Label>
              <Input
                id="region"
                name="region"
                defaultValue={university?.region ?? ""}
                className="col-span-3"
                placeholder="مثال: المنطقة الوسطى"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                نشط
              </Label>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={university?.isActive ?? true}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الحفظ..." : university ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
