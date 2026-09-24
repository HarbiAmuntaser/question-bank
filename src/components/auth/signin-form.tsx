"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./password-input";
import { GoogleAuthButton } from "./google-auth-button";
import { normalizeEmail, safeCallbackPath, type AuthPortal } from "@/lib/auth-policy";

export function SignInForm({ portal = "student", callbackUrl, registrationOpen = false, googleAuthEnabled = false, oauthError }: {
  portal?: AuthPortal;
  callbackUrl?: string;
  registrationOpen?: boolean;
  googleAuthEnabled?: boolean;
  oauthError?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const destination = safeCallbackPath(callbackUrl, portal);
  const suffix = `?callbackUrl=${encodeURIComponent(destination)}`;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const result = await signIn(`${portal}-credentials`, { email: normalizeEmail(String(data.get("email"))), password: String(data.get("password")), callbackUrl: destination, redirect: false });
      if (!result?.ok || result.error) setError("تعذر تسجيل الدخول. تحقق من بياناتك وتأكيد بريدك، أو حاول بعد قليل.");
      else window.location.assign(destination);
    } catch { setError("تعذر الاتصال. حاول مرة أخرى."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    {portal === "student" && googleAuthEnabled && <>
      <GoogleAuthButton callbackUrl={destination} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span>أو</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </>}
    {oauthError && <p role="alert" className="text-sm leading-6 text-destructive">{oauthError}</p>}
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="email">البريد الإلكتروني</Label><Input id="email" name="email" type="email" required maxLength={254} autoComplete="email" dir="ltr" className="h-11" /></div>
      <div className="space-y-2"><Label htmlFor="password">كلمة المرور</Label><PasswordInput /></div>
      {error && <p role="alert" className="text-sm leading-6 text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="h-11 w-full gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}تسجيل الدخول</Button>
    </form>
    {portal === "student" && <div className="flex flex-col items-start gap-4 text-sm">
      <Link href={`/auth/forgot-password${suffix}`} className="text-primary underline-offset-4 hover:underline">نسيت كلمة المرور؟</Link>
      <Link href={`/auth/resend-verification${suffix}`} className="text-primary underline-offset-4 hover:underline">إعادة إرسال رسالة التأكيد</Link>
      {registrationOpen && <Link href={`/auth/register${suffix}`} className="font-semibold text-primary underline-offset-4 hover:underline">إنشاء حساب طالب</Link>}
    </div>}
  </div>;
}
