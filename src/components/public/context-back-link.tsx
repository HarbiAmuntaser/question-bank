import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ContextBackLink({ href, label }: { href: string; label: string }) {
  return (
    <nav aria-label={`العودة إلى ${label}`}>
      <Link
        href={href}
        prefetch={false}
        className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground/70 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <ArrowRight
          className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
        <span className="line-clamp-1">{label}</span>
      </Link>
    </nav>
  );
}
