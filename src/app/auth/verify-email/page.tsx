import { AuthShell } from "@/components/auth/auth-shell";
import { StudentAuthForm } from "@/components/auth/student-auth-form";
import { safeCallbackPath } from "@/lib/auth-policy";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; token?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="تأكيد البريد الإلكتروني"><StudentAuthForm action="verify-email" callbackUrl={safeCallbackPath(params.callbackUrl)} token={params.token} /></AuthShell>;
}
