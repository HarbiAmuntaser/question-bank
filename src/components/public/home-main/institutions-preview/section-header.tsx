// file: src/components/public/home-main/institutions-preview/section-header.tsx

import { GraduationCap } from "lucide-react";

type Props = {
  id: string;
  title: string;
  subtitle?: string;
};

export function InstitutionsSectionHeader({
  id,
  title,
  subtitle = "الأعلى حسب عدد التخصصات",
}: Props) {
  return (
    <div className="mb-6 flex items-center gap-3 sm:mb-8">
      <div
        className="rounded-lg bg-primary/10 p-3 text-primary"
        aria-hidden
      >
        <GraduationCap className="h-6 w-6" />
      </div>

      <div>
        <h2 id={id} className="text-2xl font-bold leading-tight sm:text-3xl">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
