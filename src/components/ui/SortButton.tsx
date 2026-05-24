"use client";

import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function SortButton({
  children,
  sortBy,
  currentSort,
  sortOrder,
}: {
  children: React.ReactNode;
  sortBy: string;
  currentSort: string;
  sortOrder: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const handleSort = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", sortBy);
    params.set("sortOrder", currentSort === sortBy && sortOrder === "asc" ? "desc" : "asc");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Button
      variant="ghost"
      onClick={handleSort}
      className="flex items-center gap-1"
    >
      {children}
      {currentSort === sortBy && (
        <ArrowUpDown className={`h-4 w-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
      )}
    </Button>
  );
}