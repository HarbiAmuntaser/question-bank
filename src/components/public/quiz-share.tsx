"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Share2 } from "lucide-react";

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
  url: string;
  title: string;
  text?: string;
}) {
  const [copied, setCopied] = useState(false);

  const absUrl = useMemo(() => toAbsoluteUrl(url), [url]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = absUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function share() {
    if (!canShare(navigator)) return copyLink();

    try {
      await navigator.share({
        title,
        text: text ?? title,
        url: absUrl,
      });
    } catch {
      // User may close the native share sheet.
    }
  }

  return (
    <div className="flex justify-center" aria-live="polite">
      <Button type="button" onClick={share} className="h-11 w-full gap-2 rounded-lg sm:w-auto" aria-label="مشاركة رابط الاختبار">
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
        {copied ? "تم نسخ الرابط" : "مشاركة الاختبار"}
      </Button>
    </div>
  );
}
