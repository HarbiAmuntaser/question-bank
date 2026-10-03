"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  CreditCard,
  LogIn,
  MessageCircle,
  Ticket,
} from "lucide-react";

import { safeCallbackPath } from "@/lib/auth-policy";
import {
  codeAccessErrorMessage,
  codeAccessSuccessMessage,
  type CodeAccessOutcome,
  type CodeAccessSupport,
  whatsappCodeSupportUrl,
} from "@/lib/code-access-public";
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
type CodeAccessOperation = "activate" | "transfer";
type FlowState = "entry" | "limit" | "cooldown" | "support" | "success";

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
  data?: {
    outcome?: CodeAccessOutcome;
    alreadyRedeemed?: boolean;
    grant?: { principalType?: "account" | "guest" };
  };
  support?: CodeAccessSupport;
  code?: string;
  error?: string;
};

function scopeLabel(_scopeType: AccessPlan["scopeType"] | null | undefined) {
  return "اشتراك مادة";
}

function formatPrice(plan: AccessPlan | null) {
  if (!plan?.price) return "السعر غير محدد";
  return (plan.price + " " + (plan.currency ?? "")).trim();
}

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return String(minutes).padStart(2, "0") + ":" + String(remainder).padStart(2, "0");
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
  const [flow, setFlow] = useState<FlowState>("entry");
  const [support, setSupport] = useState<CodeAccessSupport | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const idempotencyKeys = useRef<Partial<Record<CodeAccessOperation, string>>>({});
  const plan = access?.plan ?? null;
  const planTitle = plan?.title ?? "خطة الاشتراك";
  const scopeText = scopeLabel(plan?.scopeType);
  const targetSubjectId = access?.subjectId ?? subjectId ?? null;
  const needsLogin = access?.reason === "student_signin_required";
  const unavailable = !access || ["payments_unavailable", "missing_context", "not_found"].includes(access.reason);
  const callback = safeCallbackPath(
    typeof window === "undefined" ? "/account" : window.location.pathname + window.location.search,
  );
  const supportUrl = useMemo(() => support ? whatsappCodeSupportUrl({
    whatsappNumber: support.whatsappNumber,
    supportReference: support.supportReference,
    targetTitle,
    planTitle,
    maxBrowserSessions: support.maxBrowserSessions,
  }) : null, [planTitle, support, targetTitle]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => setCooldownSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  function resetAttempt(clearCode = false) {
    idempotencyKeys.current = {};
    setFlow("entry");
    setSupport(null);
    setCooldownSeconds(0);
    setMessage(null);
    if (clearCode) setCode("");
  }

  function changeOpen(next: boolean) {
    if (!next) resetAttempt(true);
    onOpenChange(next);
  }

  function updateCode(value: string) {
    setCode(value.toUpperCase());
    resetAttempt(false);
  }

  function idempotencyKey(operation: CodeAccessOperation) {
    idempotencyKeys.current[operation] ??= crypto.randomUUID();
    return idempotencyKeys.current[operation]!;
  }

  function submitCode(operation: CodeAccessOperation) {
    const value = code.trim();
    if (!value) {
      setMessage({ type: "error", text: "أدخل كود التفعيل أولًا." });
      return;
    }
    if (!targetSubjectId) {
      setMessage({ type: "error", text: "تعذر تحديد المادة المطلوبة." });
      return;
    }

    startTransition(async () => {
      setMessage(null);
      try {
        const res = await fetch("/api/v1/student/access/redeem", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            code: value,
            quizId,
            subjectId: targetSubjectId,
            idempotencyKey: idempotencyKey(operation),
            operation,
          }),
        });
        const body = (await res.json().catch(() => null)) as RedeemResponse | null;

        if (!res.ok) {
          const errorCode = body?.code ?? body?.error;
          const nextSupport = body?.support ?? null;
          const retryAfter = nextSupport?.retryAfterSeconds ??
            (Number.parseInt(res.headers.get("retry-after") ?? "", 10) || 0);
          setSupport(nextSupport);
          setCooldownSeconds(retryAfter);
          if (errorCode === "browser_limit_reached") setFlow("limit");
          else if (errorCode === "transfer_too_soon") setFlow("cooldown");
          else if (errorCode === "transfer_support_required") setFlow("support");
          else setFlow("entry");
          setMessage({
            type: ["browser_limit_reached", "transfer_too_soon", "transfer_support_required"].includes(errorCode ?? "")
              ? "info"
              : "error",
            text: codeAccessErrorMessage(errorCode, retryAfter),
          });
          return;
        }

        const outcome = body?.data?.outcome ??
          (body?.data?.alreadyRedeemed ? "already_active" : "activated");
        setFlow("success");
        setMessage({
          type: "success",
          text: codeAccessSuccessMessage(outcome, body?.data?.grant?.principalType),
        });
        setSupport(null);
        setCooldownSeconds(0);
        idempotencyKeys.current = {};
        setCode("");
        onRedeemed();
        window.setTimeout(() => changeOpen(false), 1200);
      } catch {
        setMessage({
          type: "error",
          text: "تعذر الاتصال بخدمة التفعيل. أعد المحاولة بنفس الطلب بعد قليل.",
        });
      }
    });
  }

  if (unavailable) {
    return (
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>غير متاح حاليًا</DialogTitle>
            <DialogDescription>الاشتراك والتفعيل غير متاحين حاليًا.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto text-right sm:max-w-xl" dir="rtl">
        <DialogHeader className="space-y-2 text-right">
          <Badge variant="secondary" className="w-fit rounded-md">
            {scopeText}
          </Badge>
          <DialogTitle className="text-xl leading-snug sm:text-2xl">{planTitle}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            اختر طلب الاشتراك، أو فعّل كود الوصول مباشرة.
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
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {plan?.description ?? "اشتراك المادة"}
              </p>
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

          {needsLogin ? (
            <Alert>
              <LogIn className="h-4 w-4" aria-hidden />
              <AlertDescription className="leading-relaxed">
                يمكنك تسجيل الدخول لربط الوصول بحسابك، أو استخدام كود التفعيل أدناه دون إنشاء حساب.
              </AlertDescription>
            </Alert>
          ) : null}

          {plan && access?.canPurchase ? (
            <Button asChild className="w-full gap-2">
              <Link href={needsLogin
                ? "/auth/signin?callbackUrl=" + encodeURIComponent(callback)
                : "/account/orders/new?planId=" + encodeURIComponent(plan.id)}
              >
                {needsLogin ? <LogIn className="h-4 w-4" aria-hidden /> : <CreditCard className="h-4 w-4" aria-hidden />}
                {needsLogin ? "تسجيل الدخول لطلب الاشتراك" : "طلب اشتراك"}
              </Link>
            </Button>
          ) : null}

          {needsLogin && !access?.canPurchase && !access?.canRedeemCode ? (
            <Button asChild className="w-full gap-2">
              <Link href={"/auth/signin?callbackUrl=" + encodeURIComponent(callback)}>
                <LogIn className="h-4 w-4" aria-hidden />
                تسجيل الدخول
              </Link>
            </Button>
          ) : null}

          {access?.canRedeemCode ? (
            <div className="space-y-3 border-t pt-4">
              <div className="space-y-1">
                <Label htmlFor="subscriptionCode">كود التفعيل</Label>
                <p id="subscriptionCodeHelp" className="text-xs leading-relaxed text-muted-foreground">
                  عند تسجيل الدخول يرتبط الوصول بحسابك. بدون تسجيل دخول يبقى الوصول محفوظًا في هذا المتصفح.
                </p>
              </div>
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitCode("activate");
                }}
              >
                <Input
                  id="subscriptionCode"
                  value={code}
                  onChange={(event) => updateCode(event.target.value)}
                  placeholder="QB-XXXX-XXXX-XXXX"
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="subscriptionCodeHelp"
                  className="h-11 rounded-lg font-mono text-base"
                  disabled={pending || flow === "success"}
                />
                <Button
                  type="submit"
                  className="h-11 gap-2 rounded-lg sm:min-w-36"
                  disabled={pending || flow === "success"}
                >
                  <Ticket className="h-4 w-4" aria-hidden />
                  {pending ? "جاري التحقق..." : "تفعيل أو استعادة"}
                </Button>
              </form>

              {message ? (
                <Alert
                  aria-live="polite"
                  className={cn(
                    "rounded-lg",
                    message.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : message.type === "info"
                        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
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

              {flow === "limit" || flow === "cooldown" ? (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    نقل الوصول يوقفه في أقدم متصفح مرتبط، ولا يغير تاريخ انتهاء الاشتراك.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full gap-2"
                    onClick={() => submitCode("transfer")}
                    disabled={pending || cooldownSeconds > 0}
                  >
                    <ArrowLeftRight className="h-4 w-4" aria-hidden />
                    {cooldownSeconds > 0
                      ? "إعادة المحاولة بعد " + formatCooldown(cooldownSeconds)
                      : "نقل الوصول إلى هذا المتصفح"}
                  </Button>
                </div>
              ) : null}

              {(flow === "limit" || flow === "cooldown" || flow === "support") && support ? (
                <div className="space-y-2 border-t pt-3 text-sm">
                  {support.supportReference ? (
                    <p className="text-muted-foreground">
                      مرجع الدعم: <code dir="ltr" className="font-mono text-foreground">{support.supportReference}</code>
                    </p>
                  ) : null}
                  {supportUrl ? (
                    <Button asChild type="button" variant="outline" className="h-11 w-full gap-2">
                      <a href={supportUrl} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        طلب متصفح إضافي عبر WhatsApp
                      </a>
                    </Button>
                  ) : flow === "support" ? (
                    <p className="leading-relaxed text-muted-foreground">
                      تعذر تجهيز رابط الدعم تلقائيًا. تواصل مع إدارة المنصة واذكر مرجع الدعم الظاهر أعلاه.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
