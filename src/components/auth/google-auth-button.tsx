"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Chrome, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { safeCallbackPath } from "@/lib/auth-policy";

export function GoogleAuthButton({ callbackUrl, label = "المتابعة باستخدام Google" }: { callbackUrl?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const destination = safeCallbackPath(callbackUrl);

  async function startGoogleSignIn() {
    if (busy) return;
    setBusy(true);
    try {
      await signIn("google", { callbackUrl: destination });
    } catch {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="h-11 w-full gap-2" disabled={busy} onClick={startGoogleSignIn}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Chrome className="h-4 w-4" aria-hidden />}
      {label}
    </Button>
  );
}
