"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Clock, FileText, Layers3, Lock, ShieldCheck, Star, Unlock } from "lucide-react";

import type { AccessStatus } from "@/components/public/subscription-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { encodeSlugPath } from "@/lib/public/slug-utils";
import { cn } from "@/lib/utils";

import { StudySummarySubscribeButton } from "./study-summary-subscribe-button";

export type PublicStudySummaryCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  accessType: "inherit" | "free" | "paid";
  publishedAt: string;
  readingMinutes: number | null;
  isFeatured: boolean;
  chapter: { id: string; name: string; chapterNumber: number | null } | null;
  hasReadableContent: boolean;
  hasPdf: boolean;
};

const sectionCardClass = "overflow-hidden border bg-card/95 shadow-sm dark:bg-gray-900/80";
const accessBadgeClass = "h-7 rounded-md px-2.5 text-xs font-medium";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function accessLabel(summary: PublicStudySummaryCard, access?: AccessStatus | null, loading?: boolean) {
  if (summary.accessType === "free") return "مجاني";
  if (access?.allowed) return "مشترك";
  if (loading) return "جاري التحقق";
  return "يتطلب اشتراك";
}

function accessClass(label: string) {
  switch (label) {
    case "مجاني":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
    case "مشترك":
      return "border-primary/25 bg-primary/10 text-primary";
    case "جاري التحقق":
      return "border-muted bg-muted/40 text-muted-foreground";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
  }
}

function SummaryAccessBadge({
  summary,
  access,
  loading,
}: {
  summary: PublicStudySummaryCard;
  access?: AccessStatus | null;
  loading?: boolean;
}) {
  const label = accessLabel(summary, access, loading);
  const Icon = label === "يتطلب اشتراك" ? Lock : label === "مشترك" ? Unlock : ShieldCheck;

  return (
    <Badge variant="outline" className={cn(accessBadgeClass, accessClass(label))}>
      <Icon className="ml-1.5 h-3.5 w-3.5" aria-hidden />
      {label}
    </Badge>
  );
}

function SummaryCard({
  summary,
  basePath,
  access,
  loading,
  subjectId,
  majorId,
  onRedeemed,
}: {
  summary: PublicStudySummaryCard;
  basePath: string;
  access?: AccessStatus | null;
  loading?: boolean;
  subjectId: string;
  majorId: string;
  onRedeemed: () => void;
}) {
  const summaryHref = `${basePath}/summaries/${encodeSlugPath(summary.slug)}`;
  const allowed = summary.accessType === "free" || Boolean(access?.allowed);

  return (
    <Card className={sectionCardClass}>
      <CardHeader className="space-y-3 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {summary.isFeatured ? (
                <Badge className="gap-1">
                  <Star className="h-3.5 w-3.5" aria-hidden />
                  مميز
                </Badge>
              ) : null}
              <SummaryAccessBadge summary={summary} access={access} loading={loading} />
              {summary.chapter ? (
                <Badge variant="outline" className="gap-1">
                  <Layers3 className="h-3.5 w-3.5" aria-hidden />
                  {summary.chapter.name}
                </Badge>
              ) : null}
              {summary.readingMinutes ? (
                <Badge variant="secondary" className="gap-1 arabic-numbers">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {summary.readingMinutes} د
                </Badge>
              ) : null}
            </div>

            <CardTitle className="line-clamp-2 text-lg font-bold leading-7 sm:text-xl">{summary.title}</CardTitle>
            {summary.excerpt ? (
              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{summary.excerpt}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            {summary.hasReadableContent ? <Badge variant="default">قراءة داخل الموقع</Badge> : null}
            {summary.hasPdf ? (
              <Badge variant="secondary" className="gap-1">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                ملف PDF
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {allowed ? (
            <Button asChild className="h-11 rounded-lg sm:w-auto">
              <Link href={summaryHref} prefetch={false} className="gap-2">
                <BookOpenText className="h-4 w-4" aria-hidden />
                عرض الملخص
              </Link>
            </Button>
          ) : null}

          {!allowed ? (
            <StudySummarySubscribeButton
              access={access ?? null}
              targetTitle={summary.title}
              subjectId={access?.subjectId ?? subjectId}
              majorId={access?.majorId ?? majorId}
              disabled={loading}
              onRedeemed={onRedeemed}
            />
          ) : null}

        </div>

        <p className="text-xs text-muted-foreground arabic-numbers">نشر في {formatDate(summary.publishedAt)}</p>
      </CardContent>
    </Card>
  );
}

export function SubjectStudySummaries({
  summaries,
  basePath,
  subjectId,
  majorId,
}: {
  summaries: PublicStudySummaryCard[];
  basePath: string;
  subjectId: string;
  majorId: string;
}) {
  const [statuses, setStatuses] = useState<Record<string, AccessStatus>>({});
  const [loading, setLoading] = useState(true);
  const summaryIds = useMemo(() => summaries.map((summary) => summary.id).filter(Boolean).join(","), [summaries]);

  const refreshAccess = () => {
    if (!summaryIds) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetch(`/api/v1/student/access/status?summaryIds=${encodeURIComponent(summaryIds)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => setStatuses(body?.data?.items ?? {}))
      .catch(() => setStatuses({}))
      .finally(() => setLoading(false));
  };

  useEffect(refreshAccess, [summaryIds]);

  if (summaries.length === 0) return null;

  return (
    <section className="space-y-5" aria-labelledby="subject-summaries-heading">
      <div className="text-center">
        <h2 id="subject-summaries-heading" className="text-xl font-bold sm:text-2xl">
          ملخصات المادة
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
          ابدأ بمراجعة الملخصات المتاحة، ثم انتقل إلى الاختبارات لقياس مستواك.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {summaries.map((summary) => (
          <SummaryCard
            key={summary.id}
            summary={summary}
            basePath={basePath}
            access={statuses[summary.id] ?? null}
            loading={loading && summary.accessType !== "free"}
            subjectId={subjectId}
            majorId={majorId}
            onRedeemed={refreshAccess}
          />
        ))}
      </div>
    </section>
  );
}
