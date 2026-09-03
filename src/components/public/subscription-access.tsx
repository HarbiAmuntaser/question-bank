"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock,
  FileText,
  Lock,
  ShieldCheck,
  Ticket,
  Unlock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SubscriptionGateDialogProps } from "./subscription-gate-dialog";

const listCardClass =
  "group flex h-full flex-col overflow-hidden border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:bg-gray-900/80";
const actionButtonClass = "h-11 w-full rounded-lg gap-2 text-sm sm:text-base";
const accessBadgeClass = "h-7 rounded-md px-2.5 text-xs font-medium";

const LazySubscriptionGateDialog = dynamic<SubscriptionGateDialogProps>(
  () => import("./subscription-gate-dialog").then((mod) => mod.SubscriptionGateDialog),
  {
    ssr: false,
    loading: () => <SubscriptionDialogFallback />,
  },
);

type AccessPlan = {
  id: string;
  scopeType: "major" | "subject";
  title: string;
  description: string | null;
  price: string | null;
  currency: string | null;
  whatsappNumber: string | null;
  telegramUsername: string | null;
  contactMessage: string | null;
  majorId: string | null;
  subjectId: string | null;
};

export type AccessStatus = {
  allowed: boolean;
  requiresSubscription: boolean;
  reason: string;
  scopeType: "major" | "subject" | null;
  majorId: string | null;
  subjectId: string | null;
  plan: AccessPlan | null;
  entitlementId: string | null;
};

export type PublicQuizAccessItem = {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  accessType: "inherit" | "free" | "paid";
  isFreePreview: boolean;
  href: string;
  _count: { questions: number };
  chapter?: { id: string; name: string } | null;
};

export function isOpenWithoutStatus(quiz: Pick<PublicQuizAccessItem, "accessType" | "isFreePreview">) {
  return quiz.accessType === "free" || quiz.isFreePreview;
}

function formatPrice(plan: AccessPlan | null) {
  if (!plan?.price) return "السعر غير محدد";
  return `${plan.price} ${plan.currency ?? ""}`.trim();
}

function accessStateLabel(quiz: Pick<PublicQuizAccessItem, "accessType" | "isFreePreview">, access?: AccessStatus | null) {
  if (quiz.accessType === "free") return "مجاني";
  if (quiz.isFreePreview) return "تجربة مجانية";
  if (access?.allowed) return "مشترك";
  return "يتطلب اشتراك";
}

function accessStateClass(label: string) {
  switch (label) {
    case "مجاني":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
    case "تجربة مجانية":
      return "border-[hsl(var(--brand-cyan)_/_0.22)] bg-[hsl(var(--brand-cyan)_/_0.08)] text-[hsl(var(--brand-cyan))] dark:border-[hsl(var(--brand-cyan)_/_0.35)] dark:bg-[hsl(var(--brand-cyan)_/_0.14)]";
    case "مشترك":
      return "border-primary/25 bg-primary/10 text-primary";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
  }
}

export function QuizAccessBadges({
  quiz,
  access,
  loading,
}: {
  quiz: Pick<PublicQuizAccessItem, "accessType" | "isFreePreview">;
  access?: AccessStatus | null;
  loading?: boolean;
}) {
  const label = accessStateLabel(quiz, access);
  const Icon = label === "يتطلب اشتراك" ? Lock : label === "مشترك" ? Unlock : ShieldCheck;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className={cn(accessBadgeClass, accessStateClass(label))}>
        <Icon className="ml-1.5 h-3.5 w-3.5" aria-hidden />
        {label}
      </Badge>
      {loading && label === "يتطلب اشتراك" ? (
        <Badge variant="outline" className={cn(accessBadgeClass, "border-muted bg-muted/40 text-muted-foreground")}>
          جار التحقق
        </Badge>
      ) : null}
    </div>
  );
}

function SubscriptionDialogFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        جاري تحميل نافذة الاشتراك...
      </div>
    </div>
  );
}

export function QuizAccessAction({
  quiz,
  access,
  loading,
  label = "ابدأ الاختبار",
  subjectId,
  majorId,
  onRedeemed,
}: {
  quiz: PublicQuizAccessItem;
  access?: AccessStatus | null;
  loading?: boolean;
  label?: string;
  subjectId?: string | null;
  majorId?: string | null;
  onRedeemed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const openByDefault = isOpenWithoutStatus(quiz);
  const allowed = openByDefault || access?.allowed;
  const isLocked = !allowed;

  if (!isLocked) {
    return (
      <Button asChild className={actionButtonClass}>
        <Link href={quiz.href} prefetch={false} className="flex items-center justify-center gap-2">
          <FileText className="h-4 w-4" aria-hidden />
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        className={cn(actionButtonClass, "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200")}
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        <Lock className="h-4 w-4" aria-hidden />
        {loading ? "جار التحقق..." : access?.plan ? "لدي كود اشتراك" : "عرض خيارات الاشتراك"}
      </Button>
      {open ? (
        <LazySubscriptionGateDialog
          open={open}
          onOpenChange={setOpen}
          access={access ?? null}
          targetTitle={quiz.title}
          quizId={quiz.id}
          subjectId={subjectId}
          majorId={majorId}
          onRedeemed={onRedeemed}
        />
      ) : null}
    </>
  );
}

export function MajorSubscriptionCallout({
  majorId,
  title,
}: {
  majorId: string;
  title: string;
}) {
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const refreshAccess = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    void fetch(`/api/v1/student/access/status?majorId=${encodeURIComponent(majorId)}`, { cache: "no-store", signal })
      .then((res) => res.json())
      .then((body) => {
        if (!signal?.aborted) setAccess(body?.data ?? null);
      })
      .catch(() => {
        if (!signal?.aborted) setAccess(null);
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, [majorId]);

  useEffect(() => {
    const controller = new AbortController();
    refreshAccess(controller.signal);
    return () => controller.abort();
  }, [refreshAccess]);

  if (loading || !access?.requiresSubscription || !access.plan) return null;

  return (
    <>
      <Card className="border-primary/20 bg-primary/5 text-right shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <QuizAccessBadges quiz={{ accessType: "paid", isFreePreview: false }} access={access} />
            <div className="flex items-start gap-2 font-semibold leading-relaxed">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>هذا التخصص يحتاج اشتراك للوصول إلى الاختبارات المدفوعة.</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              الخطة: <span className="font-medium text-foreground">{access.plan.title}</span>
              {access.plan.price ? ` • ${formatPrice(access.plan)}` : ""}
            </p>
          </div>
          <Button type="button" className="h-11 w-full gap-2 rounded-lg sm:w-auto" onClick={() => setOpen(true)}>
            <Ticket className="h-4 w-4" aria-hidden />
            الاشتراك أو تفعيل كود
          </Button>
        </CardContent>
      </Card>
      {open ? (
        <LazySubscriptionGateDialog
          open={open}
          onOpenChange={setOpen}
          access={access}
          targetTitle={title}
          majorId={majorId}
          onRedeemed={refreshAccess}
        />
      ) : null}
    </>
  );
}

export function SubjectQuizzesAccessGrid({
  quizzes,
  subjectId,
  majorId,
}: {
  quizzes: PublicQuizAccessItem[];
  subjectId: string;
  majorId: string;
}) {
  const [statuses, setStatuses] = useState<Record<string, AccessStatus>>({});
  const [loading, setLoading] = useState(true);
  const quizIds = useMemo(
    () => quizzes.filter((quiz) => !isOpenWithoutStatus(quiz)).map((quiz) => quiz.id).join(","),
    [quizzes],
  );

  const refreshAccess = useCallback((signal?: AbortSignal) => {
    if (!quizIds) {
      setStatuses({});
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetch(`/api/v1/student/access/status?quizIds=${encodeURIComponent(quizIds)}`, { cache: "no-store", signal })
      .then((res) => res.json())
      .then((body) => {
        if (!signal?.aborted) setStatuses(body?.data?.items ?? {});
      })
      .catch(() => {
        if (!signal?.aborted) setStatuses({});
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, [quizIds]);

  useEffect(() => {
    const controller = new AbortController();
    refreshAccess(controller.signal);
    return () => controller.abort();
  }, [refreshAccess]);

  if (!quizzes.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
      {quizzes.map((q) => {
        const access = statuses[q.id] ?? null;
        const locked = !isOpenWithoutStatus(q) && !access?.allowed;

        return (
          <Card
            key={q.id}
            className={cn(
              listCardClass,
              locked
                ? "border-amber-200/70 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10"
                : q.isFreePreview || q.accessType === "free"
                  ? "border-emerald-200/70 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                  : access?.allowed
                    ? "border-primary/25 bg-primary/5"
                    : "",
            )}
          >
            <CardHeader className="pb-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <QuizAccessBadges quiz={q} access={access} loading={loading && !isOpenWithoutStatus(q)} />
                {locked ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    <Lock className="h-4 w-4" aria-hidden />
                  </span>
                ) : null}
              </div>
              <h3 className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary sm:text-lg">
                {q.title}
              </h3>
              {q.chapter?.name ? <p className="mt-1 text-xs text-muted-foreground">الفصل: {q.chapter.name}</p> : null}
            </CardHeader>

            <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-0 pb-6">
              {q.description ? (
                <p className="line-clamp-2 text-sm leading-6 text-foreground/75">{q.description}</p>
              ) : null}

              {locked ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  الاختبار ظاهر لك بالكامل في القائمة، ويمكن فتحه بعد تفعيل كود الاشتراك.
                </p>
              ) : q.isFreePreview ? (
                <p className="rounded-lg bg-[hsl(var(--brand-cyan)_/_0.08)] px-3 py-2 text-xs leading-relaxed text-[hsl(var(--brand-cyan))] dark:bg-[hsl(var(--brand-cyan)_/_0.14)]">
                  تجربة مجانية مناسبة للتعرّف على أسلوب الأسئلة قبل الاشتراك.
                </p>
              ) : null}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" aria-hidden /> {q._count?.questions ?? 0} أسئلة
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" aria-hidden /> {q.timeLimit} دقيقة
                </span>
              </div>

              <QuizAccessAction
                quiz={q}
                access={access}
                loading={loading && !isOpenWithoutStatus(q)}
                label="عرض الاختبار"
                subjectId={subjectId}
                majorId={majorId}
                onRedeemed={refreshAccess}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function QuizDetailsAccessGate({
  quizId,
  title,
  href,
  accessType,
  isFreePreview,
  subjectId,
  majorId,
}: {
  quizId: string;
  title: string;
  href: string;
  accessType: "inherit" | "free" | "paid";
  isFreePreview: boolean;
  subjectId: string;
  majorId: string;
}) {
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const requiresAccessCheck = accessType !== "free" && !isFreePreview;
  const [loading, setLoading] = useState(requiresAccessCheck);
  const quiz: PublicQuizAccessItem = {
    id: quizId,
    title,
    href,
    accessType,
    isFreePreview,
    description: null,
    timeLimit: 0,
    _count: { questions: 0 },
  };

  const refreshAccess = useCallback((signal?: AbortSignal) => {
    if (!requiresAccessCheck) {
      setAccess(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetch(`/api/v1/student/access/status?quizId=${encodeURIComponent(quizId)}`, { cache: "no-store", signal })
      .then((res) => res.json())
      .then((body) => {
        if (!signal?.aborted) setAccess(body?.data ?? null);
      })
      .catch(() => {
        if (!signal?.aborted) setAccess(null);
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, [quizId, requiresAccessCheck]);

  useEffect(() => {
    const controller = new AbortController();
    refreshAccess(controller.signal);
    return () => controller.abort();
  }, [refreshAccess]);

  return (
    <div className="flex justify-center">
      <div className="w-full space-y-3 text-center sm:w-auto sm:min-w-48">
        <div className="flex justify-center">
          <QuizAccessBadges quiz={quiz} access={access} loading={loading && !isOpenWithoutStatus(quiz)} />
        </div>
        <QuizAccessAction
          quiz={quiz}
          access={access}
          loading={loading && !isOpenWithoutStatus(quiz)}
          subjectId={subjectId}
          majorId={majorId}
          onRedeemed={refreshAccess}
        />
      </div>
    </div>
  );
}
