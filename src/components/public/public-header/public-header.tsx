// file: src/components/public/public-header/public-header.tsx
/**
 * Public Header (Client)
 * ----------------------
 * المسؤوليات:
 * - قراءة المسار الحالي (pathname) واستخراج الدولة/النوع
 * - بناء روابط التنقّل حسب الدولة
 * - تغيير الدولة مع الحفاظ على نفس الصفحة/النوع إن أمكن
 * - تجميع قطع الهيدر (Brand / DesktopNav / MobileNav / ThemeToggle)
 */

"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { buildNavItems } from "./nav-items";
import { getRouteState } from "./route-state";
import { Brand } from "./brand";
import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";

import type { CountryCode } from "@/config/regions";

export function PublicHeader() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  // استخراج cc + النوع الحالي (إن وجد) من المسار
  const { currentCC, currentType, secondSegment } = useMemo(
    () => getRouteState(pathname),
    [pathname]
  );

  const nav = useMemo(() => buildNavItems(currentCC), [currentCC]);
  const homeHref = `/${currentCC}`;

  /**
   * تغيير الدولة:
   * - إن كنت في صفحة نوع مؤسسة: ننقلك لنفس النوع في الدولة الجديدة
   * - إن كنت في صفحة أخرى مثل blog: ننقلك لنفس الصفحة داخل الدولة الجديدة
   * - غير ذلك: ننقلك للصفحة الرئيسية للدولة
   */
  const changeCountry = useCallback(
    (nextCC: CountryCode) => {
      if (currentType) {
        router.push(`/${nextCC}/${currentType}`);
        return;
      }

      if (secondSegment) {
        router.push(`/${nextCC}/${secondSegment}`);
        return;
      }

      router.push(`/${nextCC}`);
    },
    [router, currentType, secondSegment]
  );

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/75"
      role="banner"
    >
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* الشعار */}
        <Brand homeHref={homeHref} />

        {/* قائمة سطح المكتب (RTL ترتيب) */}
        <DesktopNav
          pathname={pathname}
          nav={nav}
          currentCC={currentCC as CountryCode}
          onChangeCountry={changeCountry}
        />

        {/* يمين الهيدر: ثيم + قائمة جوال */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <MobileNav
            pathname={pathname}
            nav={nav}
            currentCC={currentCC as CountryCode}
            onChangeCountry={changeCountry}
          />
        </div>
      </div>
    </header>
  );
}
