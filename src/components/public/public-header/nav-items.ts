// Public header navigation. Keep links limited to routes that exist in App Router.
import type { InstitutionType } from "@/config/regions";
import { isPublicInstitutionTypeEnabled } from "@/config/public-features";
import type { LucideIcon } from "lucide-react";
import { BookOpenText, Building2, GraduationCap, Home, School } from "lucide-react";

export type NavItem = {
  key: "home" | "blog" | InstitutionType;
  label: string;
  href: string;
  Icon: LucideIcon;
};

const TYPES: Array<{ key: InstitutionType; label: string; Icon: LucideIcon }> = [
  { key: "university", label: "الجامعات", Icon: Building2 },
  { key: "school", label: "المدارس", Icon: School },
  { key: "academy", label: "المسارات التدريبية", Icon: GraduationCap },
];

export function buildNavItems(cc: string): NavItem[] {
  return [
    { key: "home", label: "الصفحة الرئيسية", href: `/${cc}`, Icon: Home },
    { key: "blog", label: "المدونة", href: `/${cc}/blog`, Icon: BookOpenText },
    ...TYPES.filter((type) => isPublicInstitutionTypeEnabled(type.key)).map((t) => ({
      key: t.key,
      label: t.label,
      href: `/${cc}/${t.key}`,
      Icon: t.Icon,
    })),
  ];
}
