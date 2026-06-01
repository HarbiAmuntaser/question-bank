// Mobile navigation sheet. Reuses the public nav items and closes after selection.
"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" aria-label="فتح القائمة">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-80" aria-label="القائمة الجانبية">
        <SheetHeader className="text-right">
          <SheetTitle>القائمة</SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4">
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">الدولة</div>
            <CountrySwitcher cc={currentCC} onChange={onChangeCountry} compact />
          </div>

          {nav.map(({ key, href, label, Icon }) => {
            const active = isActiveLink(pathname, href, key);

            return (
              <SheetClose key={key} asChild>
                <Link
                  href={href}
                  // Keep prefetch limited to the home link to reduce background requests.
                  prefetch={key === "home"}
                  className={[
                    "flex min-h-11 items-center gap-2 rounded-lg p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active ? "bg-accent/70" : "hover:bg-accent",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span>{label}</span>
                </Link>
              </SheetClose>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
