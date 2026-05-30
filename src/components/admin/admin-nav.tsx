"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  File,
  FileQuestion,
  FileText,
  GraduationCap,
  Home,
  KeyRound,
  Shuffle,
  User,
} from "lucide-react";

import { SheetClose } from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { name: string; href: string; icon: LucideIcon };

export const adminNavigation: NavItem[] = [
  { name: "لوحة التحكم", href: "/admin", icon: Home },
  { name: "الجامعات", href: "/admin/universities", icon: Building2 },
  { name: "التخصصات", href: "/admin/majors", icon: GraduationCap },
  { name: "المقررات", href: "/admin/subjects", icon: BookOpen },
  { name: "الفصول", href: "/admin/chapters", icon: FileText },
  { name: "الأسئلة", href: "/admin/questions", icon: FileQuestion },
  { name: "مولد الاختبارات", href: "/admin/quiz-generator", icon: Shuffle },
  { name: "الاختبارات المنشأة", href: "/admin/quizzes", icon: ClipboardList },
  { name: "الاشتراكات", href: "/admin/subscriptions", icon: KeyRound },
  { name: "التحليلات", href: "/admin/analytics", icon: BarChart3 },
  { name: "نماذج اختبارات", href: "/admin/exams", icon: File },
  { name: "seo", href: "/admin/seo-meta", icon: File },
  { name: "المستخدمين", href: "/admin/users", icon: User },
];

export function AdminNavList({ closeOnNavigate = false }: { closeOnNavigate?: boolean }) {
  const pathname = usePathname();

  return (
    <ul role="list" className="-mx-2 space-y-1">
      {adminNavigation.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        const link = (
          <Link
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
              "h-10 w-full justify-start px-3",
              isActive && "bg-primary/10 text-primary",
            )}
          >
            <Icon className="ml-3 h-4 w-4" aria-hidden />
            <span className="truncate">{item.name}</span>
          </Link>
        );

        return (
          <li key={item.href}>
            {closeOnNavigate ? <SheetClose asChild>{link}</SheetClose> : link}
          </li>
        );
      })}
    </ul>
  );
}
