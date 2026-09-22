import type { Metadata } from "next";
import Link from "next/link";
import { requireStudentAccount } from "@/lib/auth-helpers";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignOutButton } from "@/components/auth/signout-button";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "حسابي", robots: { index: false, follow: false } };
export default async function AccountPage() {
  const user = await requireStudentAccount();
  return <AuthShell title="حسابي"><div className="space-y-6">
    <dl className="divide-y"><div className="py-4"><dt className="mb-2 text-sm text-muted-foreground">الاسم</dt><dd className="break-words font-medium">{user.name}</dd></div>
      <div className="py-4"><dt className="mb-2 text-sm text-muted-foreground">البريد الإلكتروني</dt><dd dir="ltr" className="break-all text-right">{user.email}</dd></div>
      <div className="py-4"><dt className="mb-2 text-sm text-muted-foreground">حالة البريد</dt><dd className="text-emerald-700 dark:text-emerald-400">مؤكد</dd></div></dl>
    <Link href="/account/orders" className="block text-sm text-primary hover:underline">طلبات الاشتراك</Link>
    <Link href="/auth/forgot-password" className="block text-sm text-primary hover:underline">إعادة تعيين كلمة المرور</Link>
    <SignOutButton /><Link href="/" className="block text-sm text-primary hover:underline">العودة إلى الموقع</Link>
  </div></AuthShell>;
}
