"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, Mail, Check, KeyRound, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "./password-input";
import { safeCallbackPath, PASSWORD_MIN_LENGTH, PASSWORD_MAX_BYTES } from "@/lib/auth-policy";

export type StudentAuthAction = "register" | "resend-verification" | "forgot-password" | "verify-email" | "reset-password";
export function StudentAuthForm({ action, callbackUrl, token }: { action: StudentAuthAction; callbackUrl?: string; token?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [destination, setDestination] = useState(safeCallbackPath(callbackUrl));
  const newPassword = action === "register" || action === "reset-password";
  const needsEmail = ["register", "resend-verification", "forgot-password"].includes(action);
  const needsPassword = newPassword || action === "verify-email";
  const tokenAction = action === "verify-email" || action === "reset-password";
  const label = { register: "إنشاء الحساب", "resend-verification": "إرسال رسالة التأكيد", "forgot-password": "إرسال رابط الاستعادة", "verify-email": "تأكيد البريد", "reset-password": "حفظ كلمة المرور" }[action];
  const Icon = action === "register" ? UserPlus : action === "verify-email" ? Check : action === "reset-password" ? KeyRound : Mail;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const password = String(data.password ?? "");
    if (newPassword && (password.trim().length < PASSWORD_MIN_LENGTH || new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES || password !== data.confirmPassword)) {
      setError("اختر كلمة مرور من 12 حرفًا على الأقل، وتأكد من تطابقها. الحد الأقصى 72 بايت، وقد تشغل الأحرف العربية أكثر من بايت."); return;
    }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, ...(tokenAction ? { token } : { callbackUrl: destination }) }) });
      const result = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = {
          too_many_requests: "محاولات كثيرة. انتظر قليلًا قبل المحاولة مجددًا.", registration_closed: "التسجيل غير متاح حاليًا.",
          invalid_or_expired_token: "الرابط غير صالح أو انتهت صلاحيته، أو كلمة المرور غير صحيحة. يمكنك طلب رابط جديد.",
          validation_error: "تحقق من الحقول وكلمة المرور وتأكيدها.",
        };
        setError(messages[result.error] ?? "تعذر إكمال الطلب. حاول مرة أخرى لاحقًا.");
      } else { setDestination(safeCallbackPath(result.callbackUrl ?? destination)); setDone(true); }
    } catch { setError("تعذر الاتصال. حاول مرة أخرى."); }
    finally { setBusy(false); }
  }
  if (done) return <div className="space-y-6">
    <p role="status" className="leading-8">{tokenAction ? "اكتملت العملية. يمكنك الآن تسجيل الدخول." : "إذا كان البريد مؤهلًا، ستصلك رسالة بالخطوة التالية. راجع أيضًا البريد غير المرغوب فيه."}</p>
    <Button asChild className="h-11"><Link href={`/auth/signin?callbackUrl=${encodeURIComponent(destination)}`}>تسجيل الدخول</Link></Button>
  </div>;
  if (tokenAction && !/^[A-Za-z0-9_-]{43}$/.test(token ?? "")) return <div className="space-y-5"><p role="alert">الرابط غير صالح أو غير مكتمل.</p><Link className="text-primary underline" href={action === "verify-email" ? "/auth/resend-verification" : "/auth/forgot-password"}>طلب رابط جديد</Link></div>;
  return <form onSubmit={submit} className="space-y-5">
    {action === "register" && <div className="space-y-2"><Label htmlFor="name">الاسم</Label><Input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" className="h-11" /></div>}
    {needsEmail && <div className="space-y-2"><Label htmlFor="email">البريد الإلكتروني</Label><Input id="email" name="email" type="email" required maxLength={254} autoComplete="email" dir="ltr" className="h-11" /></div>}
    {needsPassword && <div className="space-y-2"><Label htmlFor="password">{action === "verify-email" ? "كلمة المرور التي اخترتها عند التسجيل" : "كلمة المرور الجديدة"}</Label><PasswordInput autoComplete={newPassword ? "new-password" : "current-password"} minLength={newPassword ? PASSWORD_MIN_LENGTH : undefined} /></div>}
    {newPassword && <><div className="space-y-2"><Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label><PasswordInput name="confirmPassword" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} /></div><p className="text-sm leading-6 text-muted-foreground">12 حرفًا على الأقل. يمكنك استخدام عبارة يسهل عليك تذكرها.</p></>}
    {error && <p role="alert" className="text-sm leading-6 text-destructive">{error}</p>}
    <Button type="submit" disabled={busy} className="h-11 w-full gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}{label}</Button>
    <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(destination)}`} className="block text-sm text-primary hover:underline">العودة إلى تسجيل الدخول</Link>
    {tokenAction && <Link href={action === "verify-email" ? "/auth/resend-verification" : "/auth/forgot-password"} className="block text-sm text-primary hover:underline">طلب رابط جديد</Link>}
  </form>;
}
