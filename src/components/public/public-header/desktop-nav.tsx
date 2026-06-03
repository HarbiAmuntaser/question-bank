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
      <NavigationMenuList className="flex-row-reverse items-center gap-1">
        {nav.map(({ key, href, label }) => {
          const active = isActiveLink(pathname, href, key);

          return (
            <NavigationMenuItem key={key}>
              <Link
                href={href}
                // Header links are visible on every page, so only prefetch the home route.
                prefetch={key === "home"}
                className={[
                  "group relative inline-flex h-10 w-max items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
                  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "text-primary after:absolute after:bottom-1 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-primary"
                    : "text-muted-foreground",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
                aria-label={label}
              >
                <span>{label}</span>
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
