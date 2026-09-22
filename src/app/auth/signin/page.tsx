import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { safeCallbackPath } from "@/lib/auth-policy";
import { registrationConfigured } from "@/lib/server/auth-config";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/signin-form";
export const dynamic = "force-dynamic";
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const callbackUrl = safeCallbackPath((await searchParams).callbackUrl);
  const user = await getCurrentUser();
  if (user?.role === "student" && user.emailVerified) redirect(callbackUrl);
  if (user && user.role !== "student") redirect("/admin");
  return <AuthShell title="تسجيل دخول الطالب"><SignInForm callbackUrl={callbackUrl} registrationOpen={registrationConfigured()} /></AuthShell>;
}
