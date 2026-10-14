"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, FileText, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SubscriptionGateDialogProps } from "@/components/public/subscription-gate-dialog";
import { useSubscriptionReturn } from "@/components/public/use-subscription-return";
import { chapterAttachmentPurposeLabels } from "@/lib/chapter-attachments";
import type { AccessStatus } from "@/lib/payment-access";
import type { PublicChapterAttachment } from "@/lib/server/subject-chapters";
import { subscriptionReturnKey } from "@/lib/subscription-return";

const LazySubscriptionGateDialog = dynamic<SubscriptionGateDialogProps>(
  () => import("@/components/public/subscription-gate-dialog").then((mod) => mod.SubscriptionGateDialog),
  { ssr: false },
);

function formatFileSize(sizeBytes: number | null) {
  if (!sizeBytes) return null;
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function orderActionLabel(access: AccessStatus) {
  switch (access.activeOrder?.status) {
    case "pending_review": return "متابعة الطلب قيد المراجعة";
    case "awaiting_additional_payment": return "استكمال الطلب";
    default: return "متابعة طلب الاشتراك";
  }
}

export function ChapterAttachments({
  chapterId,
  subjectId,
  majorId,
  attachments,
}: {
  chapterId: string;
  subjectId: string;
  majorId: string;
  attachments: PublicChapterAttachment[];
}) {
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(attachments.length > 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const attachmentIds = useMemo(() => new Set(attachments.map((attachment) => attachment.id)), [attachments]);

  const refreshAccess = useCallback((signal?: AbortSignal) => {
    if (!attachments.length) return;
    setLoading(true);
    void fetch(`/api/v1/student/access/status?subjectId=${encodeURIComponent(subjectId)}`, { cache: "no-store", signal })
      .then((response) => response.json())
      .then((body) => { if (!signal?.aborted) setAccess(body?.data ?? null); })
      .catch(() => { if (!signal?.aborted) setAccess(null); })
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  }, [attachments.length, subjectId]);

  useEffect(() => {
    const controller = new AbortController();
    refreshAccess(controller.signal);
    return () => controller.abort();
  }, [refreshAccess]);

  const returnPrefix = "chapter-attachment:";
  const matchesReturn = useCallback((value: string) => value.startsWith(returnPrefix) && attachmentIds.has(value.slice(returnPrefix.length)), [attachmentIds]);
  const reopenDialog = useCallback((value: string) => setSelectedId(value.slice(returnPrefix.length)), []);
  useSubscriptionReturn(matchesReturn, !loading && Boolean(access), reopenDialog);

  if (!attachments.length) return null;
  const selected = attachments.find((attachment) => attachment.id === selectedId) ?? null;
  const unavailable = !access || ["payments_unavailable", "missing_context", "not_found"].includes(access.reason);

  return (
    <section className="space-y-4" aria-labelledby="chapter-attachments-heading">
      <div>
        <h2 id="chapter-attachments-heading" className="text-xl font-bold sm:text-2xl">ملفات الفصل</h2>
        <p className="mt-1 text-sm text-muted-foreground">ملفات PDF مرفقة للمطالعة داخل المنصة.</p>
      </div>
      <div className="divide-y rounded-lg border">
        {attachments.map((attachment) => {
          const size = formatFileSize(attachment.sizeBytes);
          const viewerHref = `/pdf-viewer/chapter/${chapterId}/${attachment.id}`;
          return (
            <div key={attachment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{attachment.title || attachment.originalName || "ملف PDF"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {chapterAttachmentPurposeLabels[attachment.purpose]}
                    {size ? ` · ${size}` : ""}
                  </p>
                </div>
              </div>
              {access?.allowed ? (
                <Button asChild variant="outline" className="h-10 w-full sm:w-auto">
                  <a href={viewerHref} target="_blank" rel="noreferrer">
                    <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
                    فتح الملف
                  </a>
                </Button>
              ) : access?.activeOrder ? (
                <Button asChild variant="outline" className="h-10 w-full gap-2 border-amber-200 text-amber-800 sm:w-auto">
                  <Link href={`/account/orders/${encodeURIComponent(access.activeOrder.id)}`}>
                    <Clock className="h-4 w-4" aria-hidden />
                    {orderActionLabel(access)}
                  </Link>
                </Button>
              ) : (
                <Button type="button" variant="outline" className="h-10 w-full gap-2 sm:w-auto"
                  disabled={loading || Boolean(unavailable)} onClick={() => setSelectedId(attachment.id)}>
                  <Lock className="h-4 w-4" aria-hidden />
                  {loading ? "جاري التحقق..." : unavailable ? "غير متاح حاليًا" : "يتطلب اشتراكًا"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {selected && access && !access.allowed && !access.activeOrder ? (
        <LazySubscriptionGateDialog
          open
          onOpenChange={(next) => { if (!next) setSelectedId(null); }}
          access={access}
          targetTitle={selected.title || selected.originalName || "ملف الفصل"}
          subjectId={subjectId}
          majorId={majorId}
          returnKey={subscriptionReturnKey("chapter-attachment", selected.id)}
          onRedeemed={() => refreshAccess()}
        />
      ) : null}
    </section>
  );
}
