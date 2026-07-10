"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  Send,
  Ticket,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { AccessStatus } from "./subscription-access";

type AccessPlan = NonNullable<AccessStatus["plan"]>;

export type SubscriptionGateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  access: AccessStatus | null;
  targetTitle: string;
  quizId?: string;
  subjectId?: string | null;
  majorId?: string | null;
  onRedeemed: () => void;
};

type RedeemResponse = {
  data?: { alreadyRedeemed?: boolean };
  code?: string;
  error?: string;
};

function scopeLabel(scopeType: AccessPlan["scopeType"] | null | undefined) {
  return scopeType === "major" ? "اشتراك تخصص" : "اشتراك مادة";
}

function formatPrice(plan: AccessPlan | null) {
  if (!plan?.price) return "السعر غير محدد";
  return `${plan.price} ${plan.currency ?? ""}`.trim();
}

function buildRequestMessage(plan: AccessPlan | null, title: string) {
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const scope = scopeLabel(plan?.scopeType);
  const intro =
    plan?.contactMessage?.trim() ||
    "أرغب في الاشتراك للوصول إلى المحتوى المدفوع.";

  return [
    intro,
    `نوع الطلب: ${scope}`,
    plan?.title ? `الخطة: ${plan.title}` : null,
    title ? `المحتوى: ${title}` : null,
    `الرابط: ${pageUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function whatsappHref(plan: AccessPlan | null, title: string) {
  if (!plan?.whatsappNumber) return null;
  const phone = plan.whatsappNumber.replace(/[^\d+]/g, "");
  return `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(
    buildRequestMessage(plan, title),
  )}`;
}

function telegramHref(plan: AccessPlan | null) {
  if (!plan?.telegramUsername) return null;
  return `https://t.me/${plan.telegramUsername.replace(/^@/, "")}`;
}

function redeemMessage(code: string | undefined) {
  switch (code) {
    case "code_used":
      return "هذا الكود مستخدم حاليًا أو وصل إلى الحد الأقصى من الاستخدامات. تواصل معنا للحصول على كود جديد.";
    case "inactive_code":
      return "هذا الكود غير نشط حاليًا.";
    case "code_not_started":
      return "هذا الكود لم يبدأ تفعيله بعد.";
    case "code_expired":
      return "انتهت صلاحية هذا الكود.";
    case "inactive_plan":
      return "الخطة المرتبطة بهذا الكود غير نشطة حاليًا.";
    case "invalid_plan_scope":
      return "الكود مرتبط بخطة غير مكتملة. تواصل مع الإدارة.";
    case "invalid_code":
    default:
      return "الكود غير صحيح أو غير متاح.";
  }
}

export function SubscriptionGateDialog({
  open,
  onOpenChange,
  access,
  targetTitle,
  quizId,
  subjectId,
  majorId,
  onRedeemed,
}: SubscriptionGateDialogProps) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const plan = access?.plan ?? null;
  const whats = whatsappHref(plan, targetTitle);
  const telegram = telegramHref(plan);
  const planTitle = plan?.title ?? "خطة الاشتراك";
  const scopeText = scopeLabel(plan?.scopeType);

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
      setMessage({ type: "error", text: "أدخل كود الاشتراك أولًا." });
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
      const body = (await res.json().catch(() => null)) as RedeemResponse | null;

      if (!res.ok) {
        setMessage({ type: "error", text: redeemMessage(body?.code ?? body?.error) });
        return;
      }

      setMessage({
        type: "success",
        text: body?.data?.alreadyRedeemed
          ? "هذا الكود مفعّل مسبقًا لهذا المتصفح."
          : "تم تفعيل الاشتراك بنجاح وفتح المحتوى لهذا المتصفح.",
      });
      setCode("");
      onRedeemed();
      window.setTimeout(() => onOpenChange(false), 800);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto text-right sm:max-w-xl" dir="rtl">
        <DialogHeader className="space-y-2 text-right">
          <Badge variant="secondary" className="w-fit rounded-md">
            {scopeText}
          </Badge>
          <DialogTitle className="text-xl leading-snug sm:text-2xl">{planTitle}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            أدخل كود الاشتراك أو تواصل معنا للحصول على كود يفتح المحتوى لهذا المتصفح.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-muted/25 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md bg-background">
                  {scopeText}
                </Badge>
                <span className="text-sm text-muted-foreground">المحتوى: {targetTitle}</span>
              </div>
              <div className="text-base font-semibold">{planTitle}</div>
              {plan?.description ? (
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {plan.description}
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  الاشتراك يفعّل الوصول على هذا المتصفح حسب الخطة المرتبطة بالكود.
                </p>
              )}
            </div>
            <div className="rounded-lg border bg-background px-4 py-3 text-center shadow-sm">
              <CreditCard className="mx-auto mb-1 h-4 w-4 text-muted-foreground" aria-hidden />
              <div className="text-xs text-muted-foreground">السعر</div>
              <div className="text-base font-bold">{formatPrice(plan)}</div>
            </div>
          </div>

          {!plan ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertDescription className="leading-relaxed">
                لا توجد خطة اشتراك نشطة ظاهرة لهذا المحتوى حاليًا. يمكنك تجربة إدخال كود لديك
                أو التواصل معنا لتأكيد طريقة الاشتراك.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="subscriptionCode">كود الاشتراك</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="subscriptionCode"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="QB-XXXX-XXXX-XXXX"
                dir="ltr"
                aria-describedby="subscriptionCodeHelp"
                className="h-11 rounded-lg font-mono text-base"
              />
              <Button
                type="button"
                className="h-11 gap-2 rounded-lg sm:min-w-32"
                onClick={redeem}
                disabled={pending}
              >
                <Ticket className="h-4 w-4" aria-hidden />
                {pending ? "جاري التفعيل..." : "تفعيل الكود"}
              </Button>
            </div>
            <p id="subscriptionCodeHelp" className="text-xs leading-relaxed text-muted-foreground">
              الصق الكود كما وصلك. سيتم حفظ الوصول لهذا المتصفح تلقائيًا بعد التفعيل.
            </p>
            {message ? (
              <Alert
                aria-live="polite"
                className={cn(
                  "rounded-lg",
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-destructive/25 bg-destructive/10 text-destructive",
                )}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                ) : (
                  <AlertCircle className="h-4 w-4" aria-hidden />
                )}
                <AlertDescription className="leading-relaxed">{message.text}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {whats ? (
              <Button
                asChild
                variant="outline"
                className="h-11 gap-2 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                onClick={() => recordContactClick("whatsapp")}
              >
                <a href={whats} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  اشترك عبر واتساب
                </a>
              </Button>
            ) : null}
            {telegram ? (
              <Button
                asChild
                variant="outline"
                className="h-11 gap-2 rounded-lg border-[hsl(var(--brand-cyan)_/_0.22)] bg-[hsl(var(--brand-cyan)_/_0.08)] text-[hsl(var(--brand-cyan))] hover:bg-[hsl(var(--brand-cyan)_/_0.12)] dark:border-[hsl(var(--brand-cyan)_/_0.35)] dark:bg-[hsl(var(--brand-cyan)_/_0.14)]"
                onClick={() => recordContactClick("telegram")}
              >
                <a href={telegram} target="_blank" rel="noreferrer">
                  <Send className="h-4 w-4" aria-hidden />
                  اشترك عبر تليجرام
                </a>
              </Button>
            ) : null}
          </div>

          <p className="rounded-lg bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            هل فقدت الوصول؟ تواصل معنا مع رقم الكود أو رقم الواتساب المستخدم.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
