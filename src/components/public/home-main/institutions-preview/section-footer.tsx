// file: src/components/public/home-main/institutions-preview/section-footer.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  href: string;
  ariaLabel: string;
};

export function InstitutionsSectionFooter({ href, ariaLabel }: Props) {
  return (
    <div className="mt-6 sm:mt-8 flex justify-center sm:justify-end">
      <Button
        asChild
        variant="outline"
        className="rounded-xl w-full sm:w-auto"
      >
        <Link href={href} prefetch={false} aria-label={ariaLabel}>
          عرض الكل
        </Link>
      </Button>
    </div>
  );
}
