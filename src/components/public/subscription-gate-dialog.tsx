"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { safeCallbackPath } from "@/lib/auth-policy";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
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

function scopeLabel(_scopeType: AccessPlan["scopeType"] | null | undefined) {
  return "اشتراك مادة";
}

function formatPrice(plan: AccessPlan | null) {
  if (!plan?.price) return "السعر غير محدد";
  return `${plan.price} ${plan.currency ?? ""}`.trim();
}

function redeemMessage(code: string | undefined) {
  switch (code) {
    case "payment_codes_unavailable":
      return "تفعيل الأكواد متوقف حاليًا.";
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
  onRedeemed,
}: SubscriptionGateDialogProps) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const plan = access?.plan ?? null;
  const planTitle = plan?.title ?? "خطة الاشتراك";
  const scopeText = scopeLabel(plan?.scopeType);

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
        body: JSON.stringify({ code: value, quizId, subjectId: access?.subjectId ?? subjectId }),
      });
      const body = (await res.json().catch(() => null)) as RedeemResponse | null;

      if (!res.ok) {
        setMessage({ type: "error", text: redeemMessage(body?.code ?? body?.error) });
        return;
      }

      setMessage({
        type: "success",
        text: body?.data?.alreadyRedeemed
          ? "هذا الكود مرتبط بحسابك مسبقًا."
          : "تم تفعيل الاشتراك وربطه بحسابك.",
      });
      setCode("");
      onRedeemed();
      window.setTimeout(() => onOpenChange(false), 800);
    });
  };

  const unavailable = !access || ["payments_unavailable", "missing_context", "not_found"].includes(access.reason);
  const needsLogin = access?.reason === "student_signin_required";
  if (unavailable || needsLogin) {
    const callback = safeCallbackPath(typeof window === "undefined" ? "/account" : window.location.pathname + window.location.search);
    return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir="rtl" className="text-right">
      <DialogHeader><DialogTitle>{needsLogin ? "تسجيل دخول الطالب" : "غير متاح حاليًا"}</DialogTitle>
        <DialogDescription>{needsLogin ? "سجّل الدخول بحسابك للمتابعة." : "الاشتراك والتفعيل غير متاحين حاليًا."}</DialogDescription></DialogHeader>
      {needsLogin && <Button asChild><Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`}>تسجيل الدخول</Link></Button>}
    </DialogContent></Dialog>;
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto text-right sm:max-w-xl" dir="rtl">
        <DialogHeader className="space-y-2 text-right">
          <Badge variant="secondary" className="w-fit rounded-md">
            {scopeText}
          </Badge>
          <DialogTitle className="text-xl leading-snug sm:text-2xl">{planTitle}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            اشتراك المادة مرتبط بحساب الطالب.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 border-y py-4 sm:grid-cols-[1fr_auto] sm:items-center">
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
                  اشتراك المادة
                </p>
              )}
            </div>
            <div className="px-4 py-3 text-center">
              <CreditCard className="mx-auto mb-1 h-4 w-4 text-muted-foreground" aria-hidden />
              <div className="text-xs text-muted-foreground">السعر</div>
              <div className="text-base font-bold">{formatPrice(plan)}</div>
            </div>
          </div>

          {!plan ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertDescription className="leading-relaxed">
                لا توجد خطة متاحة للبيع لهذا المحتوى حاليًا.
              </AlertDescription>
            </Alert>
          ) : null}

          {plan && access?.canPurchase && <Button asChild className="w-full gap-2"><Link href={`/account/orders/new?planId=${encodeURIComponent(plan.id)}`}>
            <CreditCard className="h-4 w-4" aria-hidden />طلب اشتراك
          </Link></Button>}

          {access?.canRedeemCode && <div className="space-y-2 border-t pt-4">
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
              التفعيل مرتبط بحسابك، وليس بالمتصفح.
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
          </div>}

        </div>
      </DialogContent>
    </Dialog>
  );
}
