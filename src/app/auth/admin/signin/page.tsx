import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import { safeCallbackPath } from "@/lib/auth-policy";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/signin-form";
export const dynamic = "force-dynamic";
export default async function AdminSignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const callbackUrl = safeCallbackPath((await searchParams).callbackUrl, "admin");
  const access = await getAdminAccess("dashboard:read");
  if (access.ok) redirect(callbackUrl);
  if (access.status === 403) redirect("/auth/forbidden");
  return <AuthShell title="تسجيل دخول الإدارة"><SignInForm portal="admin" callbackUrl={callbackUrl} /></AuthShell>;
}
