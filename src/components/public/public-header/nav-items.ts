// file: src/components/public/public-header/nav-items.ts
/**
 * تعريف عناصر التنقّل (Nav Items)
 * ------------------------------
 * - عناصر ثابتة (الأنواع + المدونة)
 * - يتم بناء الروابط حسب الدولة الحالية cc داخل buildNavItems
 */

import type { InstitutionType } from "@/config/regions";
import type { LucideIcon } from "lucide-react";
import { Building2, GraduationCap, Home, PenSquare, School } from "lucide-react";

export type NavItem = {
  key: "home" | InstitutionType | "blog";
  label: string;
  href: string;
  Icon: LucideIcon;
};

const TYPES: Array<{ key: InstitutionType; label: string; Icon: LucideIcon }> = [
  { key: "university", label: "الجامعات", Icon: Building2 },
  { key: "school", label: "المدارس", Icon: School },
  { key: "academy", label: "الأكاديميات", Icon: GraduationCap },
];

/**
 * يبني عناصر التنقّل حسب الدولة الحالية.
 * ملاحظة: ترتيب العناصر في المصفوفة “منطقي” (home ثم الأنواع ثم blog)
 * وسيتم عرضها RTL في Desktop عبر flex-row-reverse حتى تكون الصفحة الرئيسية أقصى اليمين.
 */
export function buildNavItems(cc: string): NavItem[] {
  const homeHref = `/${cc}`;
  const blogHref = `/${cc}/blog`;

  return [
    { key: "home", label: "الصفحة الرئيسية", href: homeHref, Icon: Home },
    ...TYPES.map((t) => ({
      key: t.key,
      label: t.label,
      href: `/${cc}/${t.key}`,
      Icon: t.Icon,
    })),
    { key: "blog", label: "المدونة", href: blogHref, Icon: PenSquare },
  ];
}
