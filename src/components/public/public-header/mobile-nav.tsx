// file: src/components/public/public-header/mobile-nav.tsx
/**
 * Mobile Navigation
 * -----------------
 * - قائمة جوال عبر Sheet
 * - نفس عناصر nav
 * - مبدّل دولة (compact)
 */

"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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

export function MobileNav({ pathname, nav, currentCC, onChangeCountry }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="sm" aria-label="فتح القائمة">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-80" aria-label="القائمة الجانبية">
        <div className="flex flex-col gap-4 mt-8">
          <div className="grid gap-3 p-3 rounded-md border">
            <div className="text-xs text-muted-foreground">الدولة</div>
            <CountrySwitcher cc={currentCC} onChange={onChangeCountry} compact />
          </div>

          {nav.map(({ key, href, label, Icon }) => {
            const active = isActiveLink(pathname, href, key);

            return (
              <Link
                key={key}
                href={href}
                // نفس فكرة الأداء: prefetch فقط للصفحة الرئيسية
                prefetch={key === "home"}
                className={[
                  "flex items-center gap-2 p-2 rounded-md",
                  active ? "bg-accent/70" : "hover:bg-accent",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
                aria-label={label}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
