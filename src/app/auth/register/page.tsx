import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { StudentAuthForm } from "@/components/auth/student-auth-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { googleAuthConfigured, registrationConfigured } from "@/lib/server/auth-config";
import { safeCallbackPath } from "@/lib/auth-policy";
export const dynamic = "force-dynamic";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const callbackUrl = safeCallbackPath((await searchParams).callbackUrl);
  return <AuthShell title="إنشاء حساب طالب">{registrationConfigured()
    ? <div className="space-y-6">
      {googleAuthConfigured() && <><GoogleAuthButton callbackUrl={callbackUrl} label="إنشاء حساب باستخدام Google" />
        <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden><span className="h-px flex-1 bg-border" /><span>أو</span><span className="h-px flex-1 bg-border" /></div></>}
      <StudentAuthForm action="register" callbackUrl={callbackUrl} />
    </div>
    : <div className="space-y-5"><p>التسجيل غير متاح حاليًا.</p><Link href="/auth/signin" className="text-primary underline">تسجيل الدخول</Link></div>}
  </AuthShell>;
}
