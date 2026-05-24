// file: src/components/public/public-header/desktop-nav.tsx
/**
 * Desktop Navigation
 * ------------------
 * - يعرض عناصر التنقّل في الشاشات المتوسطة فأعلى
 * - RTL: يجعل “الصفحة الرئيسية” أقصى اليمين عبر flex-row-reverse
 */

"use client";

import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

import type { NavItem } from "./nav-items";
import type { CountryCode } from "@/config/regions";
import { CountrySwitcher } from "./country-switcher";
import { isActiveLink } from "./route-state";

type Props = {
  pathname: string;
  nav: NavItem[];
  currentCC: CountryCode;
  onChangeCountry: (cc: CountryCode) => void;
};

export function DesktopNav({ pathname, nav, currentCC, onChangeCountry }: Props) {
  return (
    <NavigationMenu className="hidden md:flex" aria-label="القائمة الرئيسية">
      {/* ✅ RTL: يجعل أول عنصر (home) يظهر أقصى اليمين */}
      <NavigationMenuList className="items-center gap-1 flex-row-reverse">
        {nav.map(({ key, href, label, Icon }) => {
          const active = isActiveLink(pathname, href, key);

          return (
            <NavigationMenuItem key={key}>
              <Link
                href={href}
                // ⚡ تحسين بسيط للأداء: لا نحتاج prefetch لكل روابط الهيدر دائمًا
                // (يساعد تقليل طلبات الشبكة في Pagespeed)
                prefetch={key === "home"}
                className={[
                  "group inline-flex h-10 w-max items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                  active ? "bg-accent/70 text-accent-foreground" : "",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
                aria-label={label}
              >
                {/* gap بدل ms/me لتفادي مشاكل RTL */}
                <span className="inline-flex items-center gap-2">

                  <span>{label}</span>
                     <Icon className="h-4 w-4" aria-hidden />


                </span>
              </Link>
            </NavigationMenuItem>
          );
        })}

        <NavigationMenuItem>
          <CountrySwitcher cc={currentCC} onChange={onChangeCountry} />
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
