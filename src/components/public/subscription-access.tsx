"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BookOpen, Clock, FileText, Lock, MessageCircle, Send, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function isOpenWithoutStatus(quiz: Pick<PublicQuizAccessItem, "accessType" | "isFreePreview">) {
  return quiz.accessType === "free" || quiz.isFreePreview;
}

function buildRequestMessage(plan: AccessPlan | null, title: string) {
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const scope = plan?.scopeType === "major" ? "اشتراك تخصص" : "اشتراك مقرر";
  const base =
    plan?.contactMessage?.trim() ||
    `أرغب في ${scope}${plan?.title ? `: ${plan.title}` : ""}${title ? ` - ${title}` : ""}`;
  return `${base}\nالرابط: ${pageUrl}`;
}

function whatsappHref(plan: AccessPlan | null, title: string) {
  if (!plan?.whatsappNumber) return null;
  const phone = plan.whatsappNumber.replace(/[^\d+]/g, "");
  return `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(buildRequestMessage(plan, title))}`;
}

function telegramHref(plan: AccessPlan | null) {
  if (!plan?.telegramUsername) return null;
  return `https://t.me/${plan.telegramUsername.replace(/^@/, "")}`;
}

function SubscriptionGateDialog({
  open,
  onOpenChange,
  access,
  targetTitle,
  quizId,
  subjectId,
  majorId,
  onRedeemed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  access: AccessStatus | null;
  targetTitle: string;
  quizId?: string;
  subjectId?: string | null;
  majorId?: string | null;
  onRedeemed: () => void;
}) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const plan = access?.plan ?? null;
  const whats = whatsappHref(plan, targetTitle);
  const telegram = telegramHref(plan);

  const recordContactClick = (method: "whatsapp" | "telegram") => {
    if (!plan?.id) return;
    void fetch("/api/v1/student/access/payment-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        planId: plan.id,
        contactMethod: method,
        contactValue: method === "whatsapp" ? plan.whatsappNumber : plan.telegramUsername,
        message: buildRequestMessage(plan, targetTitle),
        pageUrl: window.location.href,
      }),
    }).catch(() => null);
  };

  const redeem = () => {
    const value = code.trim();
    if (!value) {
      setMessage("أدخل كود الاشتراك أولاً.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/v1/student/access/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ code: value, quizId, subjectId, majorId }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(
          body?.error === "invalid_code"
            ? "الكود غير صحيح أو غير متاح."
            : "تعذر تفعيل الكود. تحقق منه وحاول مرة أخرى.",
        );
        return;
      }

      setMessage("تم تفعيل الاشتراك بنجاح.");
      setCode("");
      onRedeemed();
      window.setTimeout(() => onOpenChange(false), 600);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto text-right sm:max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>{plan?.title ?? "فتح المحتوى المدفوع"}</DialogTitle>
          <DialogDescription>
            {plan?.price ? `${plan.price} ${plan.currency ?? ""}` : "أدخل كود الاشتراك أو تواصل معنا للحصول على الكود."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{targetTitle}</div>
            <div className="mt-1 text-muted-foreground">{plan?.scopeType === "major" ? "اشتراك تخصص" : "اشتراك مقرر"}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscriptionCode">لدي كود اشتراك</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="subscriptionCode"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="QB-XXXX-XXXX-XXXX"
                dir="ltr"
                className="font-mono"
              />
              <Button type="button" onClick={redeem} disabled={pending}>
                <Ticket className="ml-2 h-4 w-4" aria-hidden />
                {pending ? "جار التفعيل..." : "تفعيل"}
              </Button>
            </div>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {whats ? (
              <Button asChild variant="outline" onClick={() => recordContactClick("whatsapp")}>
                <a href={whats} target="_blank" rel="noreferrer">
                  <MessageCircle className="ml-2 h-4 w-4" aria-hidden />
                  اشترك عبر واتساب
                </a>
              </Button>
            ) : null}
            {telegram ? (
              <Button asChild variant="outline" onClick={() => recordContactClick("telegram")}>
                <a href={telegram} target="_blank" rel="noreferrer">
                  <Send className="ml-2 h-4 w-4" aria-hidden />
                  اشترك عبر تليجرام
                </a>
              </Button>
            ) : null}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            هل فقدت الوصول؟ تواصل معنا مع رقم الكود أو رقم الواتساب المستخدم.
          </p>
        </div>
      </DialogContent>
    </Dialog>
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
      <Button asChild className="h-11 w-full rounded-xl text-sm sm:text-base">
        <Link href={quiz.href} prefetch={false} className="flex items-center justify-center gap-2">
          <FileText className="h-4 w-4" aria-hidden />
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button type="button" className="h-11 w-full rounded-xl text-sm sm:text-base" variant="outline" onClick={() => setOpen(true)} disabled={loading}>
        <Lock className="ml-2 h-4 w-4" aria-hidden />
        {loading ? "جار التحقق..." : "لدي كود اشتراك"}
      </Button>
      <SubscriptionGateDialog
        open={open}
        onOpenChange={setOpen}
        access={access ?? null}
        targetTitle={quiz.title}
        quizId={quiz.id}
        subjectId={subjectId}
        majorId={majorId}
        onRedeemed={onRedeemed}
      />
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
  const quizIds = useMemo(() => quizzes.map((quiz) => quiz.id).join(","), [quizzes]);

  const refreshAccess = () => {
    if (!quizIds) return;
    setLoading(true);
    void fetch(`/api/v1/student/access/status?quizIds=${encodeURIComponent(quizIds)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => setStatuses(body?.data?.items ?? {}))
      .catch(() => setStatuses({}))
      .finally(() => setLoading(false));
  };

  useEffect(refreshAccess, [quizIds]);

  if (!quizzes.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
      {quizzes.map((q) => {
        const access = statuses[q.id] ?? null;
        const locked = !isOpenWithoutStatus(q) && !access?.allowed;

        return (
          <Card
            key={q.id}
            className="group flex h-full flex-col overflow-hidden border-2 bg-white/90 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-xl dark:bg-gray-800/90"
          >
            <CardHeader className="pb-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {q.isFreePreview || q.accessType === "free" ? <Badge variant="secondary">معاينة مجانية</Badge> : null}
                {locked ? <Badge variant="outline">مغلق</Badge> : null}
              </div>
              <CardTitle className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary sm:text-lg">
                {q.title}
              </CardTitle>
              {q.chapter?.name ? <p className="mt-1 text-xs text-muted-foreground">الفصل: {q.chapter.name}</p> : null}
            </CardHeader>

            <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-0 pb-6">
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {q.description || "لا يوجد وصف مختصر لهذا الاختبار."}
              </p>

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
  const [loading, setLoading] = useState(true);
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

  const refreshAccess = () => {
    setLoading(true);
    void fetch(`/api/v1/student/access/status?quizId=${encodeURIComponent(quizId)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => setAccess(body?.data ?? null))
      .catch(() => setAccess(null))
      .finally(() => setLoading(false));
  };

  useEffect(refreshAccess, [quizId]);

  return (
    <div className="flex justify-center">
      <div className="w-full sm:w-auto sm:min-w-48">
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
