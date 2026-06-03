// file: src/components/public/home-main/institutions-preview/institutions-preview-section.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

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
export type UniversityPreviewItem = UniversityWithStats & {
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
  initialItems,
}: {
  cc: string;
  type: InstType;
  initialItems?: UniversityPreviewItem[];
}) {
  const ccNorm = useMemo(() => normalizeCountryCode(cc), [cc]);
  const typeNorm = useMemo(() => normalizeType(type), [type]);

  const [items, setItems] = useState<UniversityPreviewItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(initialItems === undefined);
  const [error, setError] = useState<string | null>(null);

  const listHref = useMemo(
    () => buildListHref(ccNorm, typeNorm),
    [ccNorm, typeNorm],
  );
  const base = useMemo(() => `/${ccNorm}/${typeNorm}`, [ccNorm, typeNorm]);

  useEffect(() => {
    // Server-provided data makes homepage previews render useful HTML immediately.
    if (initialItems !== undefined) {
      setItems(initialItems);
      setLoading(false);
      setError(null);
      return;
    }

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
  }, [ccNorm, typeNorm, initialItems]);

  const title = getTypeLabel(typeNorm);
  const isUniversityPreview = typeNorm === "university";

  return (
    <section
      className="container py-8 sm:py-12"
      aria-labelledby={`preview-${typeNorm}`}
    >
      <InstitutionsSectionHeader
        id={`preview-${typeNorm}`}
        title={title}
        subtitle={
          isUniversityPreview
            ? "ابدأ من الجامعة ثم انتقل إلى التخصصات والمقررات والاختبارات المتاحة."
            : undefined
        }
        actionHref={isUniversityPreview ? listHref : undefined}
        actionLabel={`عرض كل ${title}`}
      />

      {loading ? (
        <PreviewLoading />
      ) : error ? (
        <PreviewError message={error} />
      ) : items.length === 0 ? (
        <PreviewEmpty />
      ) : (
        <>
          <div
            className={
              isUniversityPreview
                ? "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:gap-6"
                : "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8"
            }
            aria-live="polite"
          >
            {items.map((u, index) => {
              const href = buildInstitutionHref(base, {
                id: u.id,
                code: u.code ?? null,
                seo: u.seo ?? null,
                seoSlug: u.seoSlug ?? null,
              });
              const variant =
                isUniversityPreview ? (index === 0 ? "featured" : "compact") : "default";

              return (
                <div
                  key={u.id}
                  // ✅ بدون Wrapper وبدون any
                  className={
                    isUniversityPreview && index === 0
                      ? "md:col-span-2 xl:col-span-1"
                      : "group"
                  }
                >
                  <InstitutionPreviewCard
                    name={u.name}
                    logoUrl={u.logoUrl ?? null}
                    code={u.code ?? null}
                    city={u.city ?? null}
                    region={u.region ?? null}
                    href={href}
                    variant={variant}
                    majorCount={u._count?.majors ?? u.majors?.length ?? null}
                    quizCount={u._count?.quizzes ?? null}
                    majors={u.majors ?? []}
                  />
                </div>
              );
            })}
          </div>

          <InstitutionsSectionFooter
            href={listHref}
            ariaLabel={`عرض كل ${title}`}
            label={`عرض كل ${title}`}
            mobileOnly={isUniversityPreview}
          />
        </>
      )}
    </section>
  );
}
