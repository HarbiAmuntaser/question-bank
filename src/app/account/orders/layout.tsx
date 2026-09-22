import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicHeader } from "@/components/public/public-header/public-header";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "طلبات الاشتراك", robots: { index: false, follow: false } };
export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background" dir="rtl"><PublicHeader /><main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
    <nav className="mb-6"><Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowRight className="h-4 w-4" />حسابي</Link></nav>
    {children}</main></div>;
}
