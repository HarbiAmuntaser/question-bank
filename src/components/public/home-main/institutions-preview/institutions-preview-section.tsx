// file: src/components/public/home-main/institutions-preview/institutions-preview-section.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { UniversityWithStats } from "@/types/student";
import { studentGet } from "@/lib/student-client";

import { InstitutionsSectionHeader } from "./section-header";
import { InstitutionPreviewCard } from "./preview-card";
import { PreviewEmpty, PreviewError, PreviewLoading } from "./states";
import type { InstType } from "./types";
import { InstitutionsSectionFooter } from "./section-footer";

import {
  buildInstitutionHref,
  buildListHref,
  getTypeLabel,
  normalizeCountryCode,
  normalizeType,
} from "./utils";

/**
 * ✅ نوع محلي يطابق ما ترسله الـ API فعليًا (بدون any)
 * إذا كانت هذه الحقول موجودة في الداتا، الأفضل لاحقًا تضيفها داخل UniversityWithStats نفسه.
 */
type UniversityPreviewItem = UniversityWithStats & {
  code?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  region?: string | null;
  seo?: { slug?: string | null } | null;
  seoSlug?: string | null;
};

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "فشل تحميل البيانات";
}

export function InstitutionsPreviewSection({
  cc,
  type,
}: {
  cc: string;
  type: InstType;
}) {
  const reduceMotion = useReducedMotion();

  const ccNorm = useMemo(() => normalizeCountryCode(cc), [cc]);
  const typeNorm = useMemo(() => normalizeType(type), [type]);

  const [items, setItems] = useState<UniversityPreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listHref = useMemo(
    () => buildListHref(ccNorm, typeNorm),
    [ccNorm, typeNorm],
  );
  const base = useMemo(() => `/${ccNorm}/${typeNorm}`, [ccNorm, typeNorm]);

  useEffect(() => {
    const ac = new AbortController();
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          cc: ccNorm,
          type: typeNorm,
          limit: "3",
          withMajors: "1",
          sort: "popular",
        });

        const data = await studentGet<UniversityPreviewItem[]>(
          `/api/v1/student/universities?${params.toString()}`,
          undefined,
          ac.signal,
        );

        if (!active || ac.signal.aborted) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        // تجاهل AbortError
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!active || ac.signal.aborted) return;

        setError(getErrorMessage(err));
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
  }, [ccNorm, typeNorm]);

  const title = getTypeLabel(typeNorm);

  return (
    <section
      className="container py-8 sm:py-12"
      aria-labelledby={`preview-${typeNorm}`}
    >
      <InstitutionsSectionHeader id={`preview-${typeNorm}`} title={title} />

      {loading ? (
        <PreviewLoading />
      ) : error ? (
        <PreviewError message={error} />
      ) : items.length === 0 ? (
        <PreviewEmpty />
      ) : (
        <>
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8"
            aria-live="polite"
          >
            {items.map((u, index) => {
              const canAnimate = !reduceMotion;

              const href = buildInstitutionHref(base, {
                id: u.id,
                code: u.code ?? null,
                seo: u.seo ?? null,
                seoSlug: u.seoSlug ?? null,
              });

              return (
                <motion.div
                  key={u.id}
                  // ✅ بدون Wrapper وبدون any
                  initial={canAnimate ? { opacity: 0, y: 10 } : false}
                  animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
                  transition={canAnimate ? { delay: 0.04 * index } : undefined}
                  whileHover={canAnimate ? { y: -4 } : undefined}
                  className="group"
                >
                  <InstitutionPreviewCard
                    name={u.name}
                    logoUrl={u.logoUrl ?? null}
                    code={u.code ?? null}
                    city={u.city ?? null}
                    region={u.region ?? null}
                    href={href}
                  />
                </motion.div>
              );
            })}
          </div>

          <InstitutionsSectionFooter
            href={listHref}
            ariaLabel={`عرض كل ${title}`}
          />
        </>
      )}
    </section>
  );
}
