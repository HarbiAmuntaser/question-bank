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
    <div className="flex items-center gap-3 mb-6 sm:mb-8">
      <div
        className="p-3 bg-gradient-to-r from-green-500 to-emerald-400 rounded-2xl shadow-lg"
        aria-hidden
      >
        <GraduationCap className="h-6 w-6 text-white" />
      </div>

      <div>
        <h2 id={id} className="text-2xl sm:text-3xl font-bold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
