import Link from "next/link";
import type { Metadata } from "next";
import { SignOutButton } from "@/components/auth/signout-button";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "الوصول غير مسموح",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">الوصول غير مسموح</h1>
        <p className="text-muted-foreground">حسابك لا يملك صلاحية الوصول إلى هذه الصفحة، أو تم تعطيله.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>الصفحة الرئيسية</Link>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
