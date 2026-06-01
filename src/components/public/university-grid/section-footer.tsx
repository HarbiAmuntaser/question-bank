// file: src/components/public/university-grid/section-footer.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function GridFooter({
  href,
  label,
  count,
}: {
  href: string;
  label: string;
  count?: number;
}) {
  return (
    <div className="mt-10 sm:mt-12">
      <Button
        asChild
        variant="outline"
        className="h-11 w-full rounded-lg bg-background/80 shadow-sm sm:w-auto sm:px-8"
      >
        <Link href={href} prefetch={false}>
          {label}
          {typeof count === "number" ? ` (${count})` : ""}
        </Link>
      </Button>
    </div>
  );
}
