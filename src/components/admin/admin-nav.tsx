"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardList,
  File,
  FileQuestion,
  FileText,
  GraduationCap,
  Home,
  KeyRound,
  Newspaper,
  Shuffle,
  Tags,
  User,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { name: string; href: string; icon: LucideIcon };
type NavGroup = { name: string; href: string; icon: LucideIcon; children: NavItem[] };
type AdminNavEntry = NavItem | NavGroup;

function isGroup(item: AdminNavEntry): item is NavGroup {
  return "children" in item;
}

export const adminNavigation: AdminNavEntry[] = [
  { name: "لوحة التحكم", href: "/admin", icon: Home },
  { name: "الجامعات", href: "/admin/universities", icon: Building2 },
  { name: "التخصصات", href: "/admin/majors", icon: GraduationCap },
  { name: "المقررات", href: "/admin/subjects", icon: BookOpen },
  { name: "الفصول", href: "/admin/chapters", icon: FileText },
  { name: "الملخصات", href: "/admin/summaries", icon: FileText },
  { name: "الأسئلة", href: "/admin/questions", icon: FileQuestion },
  { name: "مولد الاختبارات", href: "/admin/quiz-generator", icon: Shuffle },
  { name: "الاختبارات المنشأة", href: "/admin/quizzes", icon: ClipboardList },
  { name: "الاشتراكات", href: "/admin/subscriptions", icon: KeyRound },
  {
    name: "المدونة",
    href: "/admin/blog",
    icon: Newspaper,
    children: [
      { name: "المدونة", href: "/admin/blog", icon: Newspaper },
      { name: "المواضيع", href: "/admin/blog/topics", icon: FileText },
      { name: "الوسوم", href: "/admin/blog/tags", icon: Tags },
    ],
  },
  { name: "التحليلات", href: "/admin/analytics", icon: BarChart3 },
  { name: "seo", href: "/admin/seo-meta", icon: File },
  { name: "المستخدمين", href: "/admin/users", icon: User },
];

function maybeClose(link: ReactNode, closeOnNavigate: boolean) {
  return closeOnNavigate ? <SheetClose asChild>{link}</SheetClose> : link;
}

function NavLink({
  item,
  isActive,
  closeOnNavigate,
  nested = false,
}: {
  item: NavItem;
  isActive: boolean;
  closeOnNavigate: boolean;
  nested?: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
        "h-10 w-full justify-start px-3",
        nested && "pr-9",
        isActive && "bg-primary/10 text-primary",
      )}
    >
      <Icon className="ml-3 h-4 w-4" aria-hidden />
      <span className="truncate">{item.name}</span>
    </Link>
  );

  return maybeClose(link, closeOnNavigate);
}

function NavGroupItem({
  group,
  pathname,
  closeOnNavigate,
}: {
  group: NavGroup;
  pathname: string;
  closeOnNavigate: boolean;
}) {
  const Icon = group.icon;
  const isOpenByDefault = pathname === group.href || pathname.startsWith(`${group.href}/`);

  return (
    <Collapsible defaultOpen={isOpenByDefault}>
      <CollapsibleTrigger
        className={cn(
          buttonVariants({ variant: isOpenByDefault ? "secondary" : "ghost" }),
          "group h-10 w-full justify-start px-3",
          isOpenByDefault && "bg-primary/10 text-primary",
        )}
        aria-label={`فتح قائمة ${group.name}`}
      >
        <Icon className="ml-3 h-4 w-4" aria-hidden />
        <span className="flex-1 truncate text-right">{group.name}</span>
        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-1">
        {group.children.map((child) => (
          <NavLink
            key={child.href}
            item={child}
            isActive={pathname === child.href}
            closeOnNavigate={closeOnNavigate}
            nested
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdminNavList({ closeOnNavigate = false }: { closeOnNavigate?: boolean }) {
  const pathname = usePathname();

  return (
    <ul role="list" className="-mx-2 space-y-1">
      {adminNavigation.map((item) => (
        <li key={item.href}>
          {isGroup(item) ? (
            <NavGroupItem group={item} pathname={pathname} closeOnNavigate={closeOnNavigate} />
          ) : (
            <NavLink item={item} isActive={pathname === item.href} closeOnNavigate={closeOnNavigate} />
          )}
        </li>
      ))}
    </ul>
  );
}
