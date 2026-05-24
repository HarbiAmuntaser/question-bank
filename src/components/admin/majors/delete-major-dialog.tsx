"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { deleteMajorAction } from "@/app/admin/majors/actions";

export function DeleteMajorDialog({ major, open, onOpenChange }: { major: { id: string; name: string }; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteMajorAction(major.id);
      if (result.success) {
        toast({ title: "نجح", description: result.message });
        onOpenChange(false);
        window.location.href = "/admin/majors";
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
          <AlertDialogDescription>سيتم حذف <strong>{major.name}</strong> نهائيًا.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700">{isLoading ? "جاري الحذف..." : "حذف"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
