// file: src/components/public/home-main/institutions-preview/section-header.tsx

import Link from "next/link";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function InstitutionsSectionHeader({
  id,
  title,
  subtitle = "الأعلى حسب عدد التخصصات",
  actionHref,
  actionLabel = "عرض الكل",
}: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-3 text-primary" aria-hidden>
          <MapPin className="h-6 w-6" />
        </div>

        <div>
          <h2 id={id} className="text-2xl font-bold leading-tight sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>

      {actionHref ? (
        <Button
          asChild
          variant="outline"
          className="hidden h-11 rounded-lg shadow-sm sm:inline-flex"
        >
          <Link href={actionHref} prefetch={false}>
            {actionLabel}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
