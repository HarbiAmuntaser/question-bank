import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/public/public-header/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground" dir="rtl">
    <header className="border-b"><div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6"><Brand homeHref="/" /><ThemeToggle /></div></header>
    <main id="main-content" className="mx-auto w-full max-w-md px-5 py-12 sm:py-16">
      <h1 className="mb-8 text-2xl font-bold tracking-normal">{title}</h1>
      {children}
      <nav aria-label="السياسات" className="mt-10 flex flex-wrap gap-5 border-t pt-5 text-sm text-muted-foreground">
        <Link href="/public/privacy" className="hover:text-foreground">الخصوصية</Link>
        <Link href="/public/terms" className="hover:text-foreground">الشروط</Link>
        <Link href="/public/contact" className="hover:text-foreground">التواصل</Link>
      </nav>
    </main>
  </div>;
}
