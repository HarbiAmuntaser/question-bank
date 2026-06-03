import Link from "next/link";

export function Brand({ homeHref }: { homeHref: string }) {
  return (
    <Link
      href={homeHref}
      prefetch
      aria-label="الانتقال إلى الصفحة الرئيسية"
      className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <img
        src="/brand/mustawak-mark-clean.svg"
        alt=""
        className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
        aria-hidden
      />

      <span className="truncate text-lg font-extrabold tracking-normal text-foreground sm:text-2xl">
        مستواك
      </span>
    </Link>
  );
}
