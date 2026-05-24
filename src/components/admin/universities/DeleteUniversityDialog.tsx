"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteUniversityAction } from "@/app/admin/universities/actions";

// نفس النوع المصغّر المستخدم في بقية المكوّنات
export interface UniversityMinimal {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

interface DeleteUniversityDialogProps {
  university: UniversityMinimal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUniversityDialog({ university, open, onOpenChange }: DeleteUniversityDialogProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteUniversityAction(university.id);
      if (result.success) {
        toast({ title: "نجح", description: result.message });
        onOpenChange(false);
        // يفضّل تحديث الجدول بعد الحذف
        window.location.href = "/admin/universities";
      } else {
        toast({ title: "خطأ", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
          <AlertDialogDescription>
            لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف <strong>{university.name}</strong> نهائياً.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
            {isLoading ? "جاري الحذف..." : "حذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
