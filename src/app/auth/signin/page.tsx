import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { safeCallbackPath } from "@/lib/auth-policy";
import { googleAuthConfigured, registrationConfigured } from "@/lib/server/auth-config";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/signin-form";
export const dynamic = "force-dynamic";
function oauthErrorMessage(error?: string) {
  if (error === "OAuthAccountNotLinked") return "هذا البريد مرتبط بطريقة دخول أخرى. استخدم البريد وكلمة المرور الحالية.";
  if (error === "AccessDenied") return "تعذر تسجيل الدخول عبر Google. إنشاء حساب جديد غير متاح حاليًا أو أن الحساب غير مؤهل.";
  if (error) return "تعذر تسجيل الدخول عبر Google. حاول مرة أخرى.";
  return undefined;
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(params.callbackUrl);
  const user = await getCurrentUser();
  if (user?.role === "student" && user.emailVerified) redirect(callbackUrl);
  if (user && user.role !== "student") redirect("/admin");
  return <AuthShell title="تسجيل دخول الطالب"><SignInForm callbackUrl={callbackUrl} registrationOpen={registrationConfigured()}
    googleAuthEnabled={googleAuthConfigured()} oauthError={oauthErrorMessage(params.error)} /></AuthShell>;
}
