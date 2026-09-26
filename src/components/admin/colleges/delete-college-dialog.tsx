"use client";

import { useState } from "react";

import { deleteCollegeAction } from "@/app/admin/colleges/actions";
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
import { useToast } from "@/hooks/use-toast";

export function DeleteCollegeDialog({
  college,
  open,
  onOpenChange,
}: {
  college: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  const remove = async () => {
    setPending(true);
    try {
      const result = await deleteCollegeAction(college.id);
      toast({
        title: result.success ? "نجح" : "تعذر الحذف",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        onOpenChange(false);
        window.location.href = "/admin/colleges";
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف الكلية</AlertDialogTitle>
          <AlertDialogDescription>
            لا يمكن حذف {college.name} إذا كانت مرتبطة بتخصصات. انقل التخصصات أو فك ارتباطها أولًا.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={remove} disabled={pending} className="bg-red-600 hover:bg-red-700">
            {pending ? "جاري الحذف..." : "حذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
