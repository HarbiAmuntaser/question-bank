"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { safeCallbackPath } from "@/lib/auth-policy";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.42l-3.24-2.53c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.88A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.29.31-1.88V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.61Z" />
      <path fill="#EA4335" d="M12 5.99c1.47 0 2.79.5 3.83 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.61C7.18 7.75 9.39 5.99 12 5.99Z" />
    </svg>
  );
}

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
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <GoogleMark />}
      {label}
    </Button>
  );
}
