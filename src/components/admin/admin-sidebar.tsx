"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Building2,
  GraduationCap,
  BookOpen,
  FileQuestion,
  BarChart3,
  Settings,
  Home,
  FileText,
  Shuffle,
  ClipboardList,
  User,
  File,
  Newspaper,
  Tags,
  LayoutList,
  ChevronDown,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";

type NavItem = { name: string; href: string; icon: any };
type NavGroup = { name: string; icon: any; baseHref: string; items: NavItem[] };

const navigation: NavItem[] = [
  { name: "لوحة التحكم", href: "/admin", icon: Home },
  { name: "الجامعات", href: "/admin/universities", icon: Building2 },
  { name: "التخصصات", href: "/admin/majors", icon: GraduationCap },
  { name: "المقررات", href: "/admin/subjects", icon: BookOpen },
  { name: "الفصول", href: "/admin/chapters", icon: FileText },
  { name: "الأسئلة", href: "/admin/questions", icon: FileQuestion },
  { name: "مولد الاختبارات", href: "/admin/quiz-generator", icon: Shuffle },
  { name: "الاختبارات المُنشأة", href: "/admin/quizzes", icon: ClipboardList },
  { name: "التحليلات", href: "/admin/analytics", icon: BarChart3 },
  { name: "نماذج اختبارات", href: "/admin/exams", icon: File },
  { name: "seo", href: "/admin/seo-meta", icon: File },
  // { name: "الإعدادات", href: "/admin/settings", icon: Settings },
  { name: "المستخدمين", href: "/admin/users", icon: User },
];


export function AdminSidebar() {
  const pathname = usePathname();

  // افتح مجموعة المدونة تلقائيًا عند دخول أي صفحة ضمنها

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col" dir="rtl">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-900 px-6 pb-4 shadow-sm border-l">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-xl font-bold text-primary">بنك الأسئلة السعودي</h1>
        </div>

        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-4">
            {/* روابط رئيسية */}
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <li key={item.name}>
                      <Link href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn("w-full justify-start", isActive && "bg-primary/10 text-primary")}
                        >
                          <Icon className="ml-3 h-4 w-4" />
                          {item.name}
                        </Button>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* مجموعة المدونة (قابلة للطي) */}
           
          </ul>
        </nav>
      </div>
    </div>
  );
}
