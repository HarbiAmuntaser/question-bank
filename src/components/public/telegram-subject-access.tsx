"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, Loader2, MessageCircle, RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ACCESS_UPDATED_EVENT = "mustawak:access-updated";

type MembershipStatus = "pending_join" | "active" | "left" | "removal_pending" | "removed" | "error";
type TelegramStatus = {
  configured: boolean;
  enabled: boolean;
  channelStatus: "connected" | "degraded" | "disconnected" | null;
  membership: {
    id: string;
    status: MembershipStatus;
    accessExpiresAt: string | null;
    joinedAt: string | null;
    lastErrorCode: string | null;
  } | null;
};

function statusCopy(status: MembershipStatus | null | undefined) {
  if (status === "active") return {
    title: "عضوية تيليجرام فعالة",
    description: "يمكنك متابعة محتوى المادة داخل القناة الخاصة.",
  };
  if (status === "pending_join") return {
    title: "بانتظار طلب الانضمام",
    description: "افتح محادثة البوت واستخدم زر طلب الانضمام الذي أرسله لك.",
  };
  if (status === "removal_pending") return {
    title: "جار تحديث العضوية",
    description: "تتم الآن مزامنة حالة وصولك مع تيليجرام.",
  };
  if (status === "left" || status === "removed") return {
    title: "تحتاج إلى ربط جديد",
    description: "اطلب رابطًا جديدًا لإعادة الانضمام بعد التحقق من وصولك الحالي.",
  };
  if (status === "error") return {
    title: "تعذر إكمال المزامنة",
    description: "يمكنك طلب رابط جديد، وسيعيد النظام المحاولة بأمان.",
  };
  return {
    title: "قناة المادة على تيليجرام",
    description: "اربط وصولك الحالي بحساب تيليجرام للانضمام إلى القناة الخاصة.",
  };
}

export function TelegramSubjectAccess({ subjectId }: { subjectId: string }) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/v1/student/telegram?subjectId=" + encodeURIComponent(subjectId),
        { cache: "no-store", headers: { accept: "application/json" } },
      );
      if ([401, 403, 404].includes(response.status)) {
        setVisible(false);
        setStatus(null);
        return;
      }
      const body = await response.json().catch(() => null) as { data?: TelegramStatus } | null;
      if (!response.ok || !body?.data?.configured || !body.data.enabled) {
        setVisible(false);
        setStatus(null);
        return;
      }
      setVisible(true);
      setStatus(body.data);
      setMessage(null);
    } catch {
      setMessage("تعذر التحقق من حالة تيليجرام حاليًا.");
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    void refresh();
    const onAccessUpdated = () => {
      setLoading(true);
      void refresh();
    };
    window.addEventListener(ACCESS_UPDATED_EVENT, onAccessUpdated);
    return () => window.removeEventListener(ACCESS_UPDATED_EVENT, onAccessUpdated);
  }, [refresh]);

  function requestLink() {
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch("/api/v1/student/telegram", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ subjectId }),
        });
        const body = await response.json().catch(() => null) as {
          data?: { startUrl?: string };
          error?: string;
        } | null;
        if (!response.ok || !body?.data?.startUrl) {
          setMessage(response.status === 429
            ? "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة."
            : "تعذر إنشاء رابط تيليجرام. تحقق من استمرار وصولك ثم أعد المحاولة.");
          return;
        }
        window.location.assign(body.data.startUrl);
      } catch {
        setMessage("تعذر الاتصال بالخدمة حاليًا. أعد المحاولة بعد قليل.");
      }
    });
  }

  if (!visible) return null;
  if (loading) {
    return <div className="h-24 animate-pulse border-y bg-muted/30" aria-label="جار تحميل حالة تيليجرام" />;
  }
  if (!status) {
    return message ? (
      <Alert variant="destructive">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    ) : null;
  }

  const membershipStatus = status.membership?.status;
  const copy = statusCopy(membershipStatus);
  const active = membershipStatus === "active";
  const waiting = membershipStatus === "pending_join" || membershipStatus === "removal_pending";

  return (
    <Card className="border-sky-200 bg-sky-50/50 shadow-none dark:border-sky-900/60 dark:bg-sky-950/20">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200">
            <MessageCircle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold sm:text-base">{copy.title}</h2>
              {active ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />فعال</Badge> : null}
              {waiting ? <Badge variant="secondary">قيد المعالجة</Badge> : null}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
            {message ? <p className="text-sm text-destructive" role="alert">{message}</p> : null}
          </div>
        </div>
        {!active && membershipStatus !== "removal_pending" ? (
          <Button type="button" onClick={requestLink} disabled={pending} className="shrink-0 gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> :
              membershipStatus ? <RefreshCw className="h-4 w-4" aria-hidden /> : <ExternalLink className="h-4 w-4" aria-hidden />}
            {pending ? "جار إنشاء الرابط..." : membershipStatus ? "طلب رابط جديد" : "الربط مع تيليجرام"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
