import { Building2, ClipboardCheck, Layers3 } from "lucide-react";

import type { HeroStatsProps } from "./types";

const icons = [Building2, Layers3, ClipboardCheck] as const;

export function HeroStats({ stats }: HeroStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((item, index) => {
        const Icon = icons[index] ?? ClipboardCheck;

        return (
          <div
            key={item.label}
            className="rounded-xl border bg-background/70 p-4 shadow-sm dark:bg-slate-950/40"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm font-extrabold text-foreground">{item.label}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-foreground/60">
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
