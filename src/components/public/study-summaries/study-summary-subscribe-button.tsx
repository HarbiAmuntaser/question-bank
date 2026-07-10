"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccessStatus } from "@/components/public/subscription-access";
import type { SubscriptionGateDialogProps } from "@/components/public/subscription-gate-dialog";

const LazySubscriptionGateDialog = dynamic<SubscriptionGateDialogProps>(
  () => import("@/components/public/subscription-gate-dialog").then((mod) => mod.SubscriptionGateDialog),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
        <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          جاري تحميل نافذة الاشتراك...
        </div>
      </div>
    ),
  },
);

export function StudySummarySubscribeButton({
  access,
  targetTitle,
  subjectId,
  majorId,
  onRedeemed,
  disabled,
  className,
}: {
  access: AccessStatus | null;
  targetTitle: string;
  subjectId?: string | null;
  majorId?: string | null;
  onRedeemed?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-11 w-full rounded-lg gap-2 border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 sm:w-auto",
          className,
        )}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Lock className="h-4 w-4" aria-hidden />
        {disabled ? "جاري التحقق..." : access?.plan ? "لدي كود اشتراك" : "عرض خيارات الاشتراك"}
      </Button>
      {open ? (
        <LazySubscriptionGateDialog
          open={open}
          onOpenChange={setOpen}
          access={access}
          targetTitle={targetTitle}
          subjectId={subjectId ?? access?.subjectId ?? null}
          majorId={majorId ?? access?.majorId ?? null}
          onRedeemed={onRedeemed ?? (() => router.refresh())}
        />
      ) : null}
    </>
  );
}
