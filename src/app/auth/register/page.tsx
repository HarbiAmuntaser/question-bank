import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { StudentAuthForm } from "@/components/auth/student-auth-form";
import { registrationConfigured } from "@/lib/server/auth-config";
import { safeCallbackPath } from "@/lib/auth-policy";
export const dynamic = "force-dynamic";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  return <AuthShell title="إنشاء حساب طالب">{registrationConfigured()
    ? <StudentAuthForm action="register" callbackUrl={safeCallbackPath((await searchParams).callbackUrl)} />
    : <div className="space-y-5"><p>التسجيل غير متاح حاليًا.</p><Link href="/auth/signin" className="text-primary underline">تسجيل الدخول</Link></div>}
  </AuthShell>;
}
