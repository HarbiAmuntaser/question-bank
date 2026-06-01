// Public header navigation. Keep links limited to routes that exist in App Router.
import type { InstitutionType } from "@/config/regions";
import type { LucideIcon } from "lucide-react";
import { Building2, GraduationCap, Home, School } from "lucide-react";

export type NavItem = {
  key: "home" | InstitutionType;
  label: string;
  href: string;
  Icon: LucideIcon;
};

const TYPES: Array<{ key: InstitutionType; label: string; Icon: LucideIcon }> = [
  { key: "university", label: "الجامعات", Icon: Building2 },
  { key: "school", label: "المدارس", Icon: School },
  { key: "academy", label: "الأكاديميات", Icon: GraduationCap },
];

export function buildNavItems(cc: string): NavItem[] {
  return [
    { key: "home", label: "الصفحة الرئيسية", href: `/${cc}`, Icon: Home },
    ...TYPES.map((t) => ({
      key: t.key,
      label: t.label,
      href: `/${cc}/${t.key}`,
      Icon: t.Icon,
    })),
  ];
}
