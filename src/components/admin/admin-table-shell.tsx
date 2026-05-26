import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AdminTableShell({
  children,
  minWidth = "min-w-[900px]",
  className,
}: {
  children: ReactNode;
  minWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border", className)}>
      <div className="overflow-x-auto">
        <div className={cn("w-full", minWidth)}>{children}</div>
      </div>
    </div>
  );
}
