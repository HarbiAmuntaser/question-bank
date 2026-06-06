import Image from "next/image";
import Link from "next/link";

export function Brand({ homeHref }: { homeHref: string }) {
  return (
    <Link
      href={homeHref}
      prefetch
      aria-label="الانتقال إلى الصفحة الرئيسية"
      className="group inline-flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 ring-1 ring-border/70 transition-colors group-hover:bg-white dark:bg-white/95 sm:h-10 sm:w-10">
        <Image
          src="/brand/mustawak-icon-512.png"
          alt=""
          width={512}
          height={512}
          priority
          className="h-8 w-8 object-contain sm:h-9 sm:w-9"
          sizes="40px"
          aria-hidden
        />
      </span>

      <span className="truncate text-xl font-extrabold leading-none tracking-normal text-foreground transition-colors group-hover:text-primary sm:text-2xl">
        مستواك
      </span>
    </Link>
  );
}
