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
        className="rounded-xl w-full sm:w-auto sm:px-8 h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 shadow-lg"
      >
        <Link href={href} prefetch={false}>
          {label}
          {typeof count === "number" ? ` (${count})` : ""}
        </Link>
      </Button>
    </div>
  );
}
