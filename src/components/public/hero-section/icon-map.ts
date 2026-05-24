// file: src/components/public/hero-section/icon-map.ts
/**
 * Icon Map
 * --------
 * ربط أسماء الأيقونات القادمة من محتوى الهيرو بأيقونات Lucide.
 */

import type { LucideIcon } from "lucide-react";
import {
  GraduationCap as GraduationIcon,
  Trophy as TrophyIcon,
  Users as UsersIcon,
  BookOpen,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  graduation: GraduationIcon,
  trophy: TrophyIcon,
  users: UsersIcon,
  book: BookOpen,
};
