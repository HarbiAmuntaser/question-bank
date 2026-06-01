import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function Brand({ homeHref }: { homeHref: string }) {
  return (
    <Link
      href={homeHref}
      prefetch
      aria-label="الانتقال إلى الصفحة الرئيسية"
      className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        aria-hidden
      >
        <GraduationCap className="h-5 w-5" />
      </span>

      <span className="truncate text-base font-bold text-foreground sm:text-xl">بنك الأسئلة</span>
    </Link>
  );
}
