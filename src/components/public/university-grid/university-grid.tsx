// file: src/components/public/university-grid/university-grid.tsx

"use client";

/**
 * UniversityGrid (Refactor)
 * -------------------------
 * ✅ تحسينات:
 * - تقسيم إلى ملفات صغيرة (Header / SearchBar / Card / States)
 * - إزالة any بالكامل (ESLint)
 * - بطاقة خفيفة مثل الصفحة الرئيسية (بدون إحصاءات داخل البطاقة)
 * - Debounce ثابت للبحث لتقليل الضغط + منع فقدان المؤشر
 * - حركات خفيفة للجوال/الآيباد (بدون hover مبالغ)
 */

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { studentGet } from "@/lib/student-client";
import { getUniversityGridTexts } from "@/content/university-grid";

import type { InstType, UniversityGridItem } from "./types";
import { normalizeCountryCode, normalizeType, buildBase, buildListHref, buildUniversityHref } from "./utils";
import { useDebouncedValue } from "./use-debounced-value";

import { GridHeader } from "./grid-header";
import { UniversitySearchBar } from "./search-bar";
import { InstitutionGridCard } from "./institution-card";
import { GridEmpty, GridError, GridLoading } from "./states";
import { GridFooter } from "./section-footer";

export function UniversityGrid({
  cc,
  type,
  showSearch = true,
  showViewAll = false,
}: {
  cc: string;
  type: InstType;
  lang?: string;
  showSearch?: boolean;
  showViewAll?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  const ccNorm = useMemo(() => normalizeCountryCode(cc), [cc]);
  const typeNorm = useMemo(() => normalizeType(type), [type]);

  const ui = useMemo(() => getUniversityGridTexts(ccNorm, typeNorm), [ccNorm, typeNorm]);

  const [items, setItems] = useState<UniversityGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const base = useMemo(() => buildBase(ccNorm, typeNorm), [ccNorm, typeNorm]);
  const listHref = useMemo(() => buildListHref(ccNorm, typeNorm), [ccNorm, typeNorm]);

  useEffect(() => {
    const ac = new AbortController();
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          limit: "200",        // بدل 1000 لتخفيف الحمل (تقدر ترفعها لاحقاً)
          withMajors: "0",     // ✅ لا نحتاج majors الآن (خفيف جداً)
          cc: ccNorm,
          type: typeNorm,
          sort: "name",
        });

        const q = debouncedQuery.trim();
        if (q) params.set("q", q);

        const data = await studentGet<UniversityGridItem[]>(
          `/api/v1/student/universities?${params.toString()}`,
          undefined,
          ac.signal
        );

        if (!active || ac.signal.aborted) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (!active || ac.signal.aborted) return;

        const msg =
          e instanceof Error ? e.message : "فشل تحميل المؤسسات";
        // تجاهل AbortError بدون إزعاج
        if (msg.toLowerCase().includes("aborted")) return;

        setError(msg);
      } finally {
        if (!active || ac.signal.aborted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      ac.abort();
    };
  }, [ccNorm, typeNorm, debouncedQuery]);

  const canAnimate = !reduceMotion;

  if (loading) return <GridLoading />;
  if (error) return <GridError message={error} />;

  return (
    <section
      className="py-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30"
      aria-labelledby="institutions-heading"
    >
      <div className="max-w-7xl mx-auto">
        <GridHeader heading={ui.heading} subheading={ui.subheading} />

        {showSearch && (
          <UniversitySearchBar
            value={query}
            onChange={setQuery}
            label={ui.searchLabel}
            placeholder={ui.searchPlaceholder}
          />
        )}

        {items.length === 0 ? (
          <GridEmpty title={ui.noResultsTitle} text={ui.noResultsText} />
        ) : (
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8"
            aria-live="polite"
          >
            {items.map((u, index) => {
              const href = buildUniversityHref(base, u);

              // حركة بسيطة جداً
              const Wrapper = canAnimate ? motion.div : "div";

              return (
                <Wrapper
                  key={u.id}
                  initial={canAnimate ? { opacity: 0, y: 10 } : undefined}
                  animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
                  transition={canAnimate ? { delay: Math.min(0.04 * index, 0.25) } : undefined}
                  className="group"
                >
                  <InstitutionGridCard
                    name={u.name}
                    href={href}
                    logoUrl={u.logoUrl}
                    code={u.code}
                    badgeText={ui.badgeText}
                    badgeAria={ui.badgeAria}
                    ctaText={ui.ctaExplore}
                  />
                </Wrapper>
              );
            })}
          </div>
        )}

        {showViewAll && items.length > 6 && (
          <GridFooter href={listHref} label={ui.viewAll} count={items.length} />
        )}
      </div>
    </section>
  );
}
