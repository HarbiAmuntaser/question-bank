"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { disableBlogTagAction, disableBlogTopicAction } from "@/app/admin/blog/actions";
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

import type { BlogTaxonomyKind, BlogTaxonomyRow } from "./types";

export function DisableBlogTaxonomyDialog({
  kind,
  item,
  children,
  open,
  onOpenChange,
}: {
  kind: BlogTaxonomyKind;
  item: BlogTaxonomyRow;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const label = kind === "topic" ? "الموضوع" : "الوسم";

  const handleDisable = () => {
    startTransition(async () => {
      const result =
        kind === "topic" ? await disableBlogTopicAction(item.id) : await disableBlogTagAction(item.id);

      if (result.success) {
        toast({ title: "تم التعطيل", description: result.message });
        onOpenChange?.(false);
        router.refresh();
        return;
      }

      toast({ title: "تعذر التعطيل", description: result.message, variant: "destructive" });
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children ? <AlertDialogTrigger asChild>{children}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تعطيل {label}</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم تعطيل &quot;{item.name}&quot; بدل حذفه نهائيًا، حتى تبقى العلاقات المستقبلية مع المقالات آمنة.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isPending}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleDisable();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "جار التعطيل..." : "تعطيل"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
