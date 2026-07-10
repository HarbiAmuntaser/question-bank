"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { archiveStudySummaryAction } from "@/app/admin/summaries/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import type { StudySummaryRow } from "./types";

export function ArchiveSummaryDialog({
  summary,
  children,
  open,
  onOpenChange,
}: {
  summary: StudySummaryRow;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveStudySummaryAction(summary.id);
      if (result.success) {
        toast({ title: "تمت الأرشفة", description: result.message });
        onOpenChange?.(false);
        router.refresh();
        return;
      }
      toast({ title: "تعذر الأرشفة", description: result.message, variant: "destructive" });
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children ? <AlertDialogTrigger asChild>{children}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>أرشفة الملخص</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم نقل &quot;{summary.title}&quot; إلى حالة مؤرشف بدل الحذف النهائي.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isPending}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleArchive();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "جاري الأرشفة..." : "أرشفة"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
