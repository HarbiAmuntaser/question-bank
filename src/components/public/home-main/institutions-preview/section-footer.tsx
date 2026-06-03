// file: src/components/public/home-main/institutions-preview/section-footer.tsx

import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  href: string;
  ariaLabel: string;
  label?: string;
  mobileOnly?: boolean;
};

export function InstitutionsSectionFooter({
  href,
  ariaLabel,
  label = "عرض الكل",
  mobileOnly = false,
}: Props) {
  return (
    <div className={mobileOnly ? "mt-6 flex justify-center sm:hidden" : "mt-6 flex justify-center sm:mt-8 sm:justify-end"}>
      <Button
        asChild
        variant="outline"
        className="h-11 w-full rounded-lg shadow-sm sm:w-auto"
      >
        <Link href={href} prefetch={false} aria-label={ariaLabel}>
          {label}
        </Link>
      </Button>
    </div>
  );
}
