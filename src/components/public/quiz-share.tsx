"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check } from "lucide-react";

type WebShareData = {
  title?: string;
  text?: string;
  url?: string;
};

type NavigatorWithShare = Navigator & {
  share?: (data: WebShareData) => Promise<void>;
};

function canShare(n: Navigator): n is NavigatorWithShare {
  return typeof (n as NavigatorWithShare).share === "function";
}

function toAbsoluteUrl(url: string) {
  // لو الرابط نسبي: /SA/... نحوله لمطلق على العميل
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return origin ? `${origin}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

export function QuizShare({
  url,
  title,
  text,
}: {
  url: string;     // يمكن يكون نسبي أو مطلق
  title: string;
  text?: string;
}) {
  const [copied, setCopied] = useState(false);

  const absUrl = useMemo(() => toAbsoluteUrl(url), [url]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback بسيط
      const ta = document.createElement("textarea");
      ta.value = absUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  }

  async function share() {
    // إن لم تتوفر مشاركة أصلية → ننسخ الرابط
    if (!canShare(navigator)) return copyLink();

    try {
      await navigator.share({
        title,
        text: text ?? title,
        url: absUrl,
      });
    } catch {
      // المستخدم قد يغلق نافذة المشاركة — لا مشكلة
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 justify-center">
      <Button type="button" onClick={share} className="gap-2 h-11 rounded-xl">
        <Share2 className="h-4 w-4" aria-hidden />
        مشاركة الاختبار
      </Button>

      <Button type="button" variant="outline" onClick={copyLink} className="gap-2 h-11 rounded-xl">
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? "تم النسخ" : "نسخ الرابط"}
      </Button>
    </div>
  );
}
