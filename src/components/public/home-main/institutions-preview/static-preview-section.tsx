// file: src/components/public/home-main/institutions-preview/static-preview-section.tsx

import { InstitutionsSectionHeader } from "./section-header";
import { InstitutionPreviewCard } from "./preview-card";
import { PreviewEmpty } from "./states";
import { InstitutionsSectionFooter } from "./section-footer";
import type { InstType } from "./types";
import type { UniversityPreviewItem } from "./institutions-preview-section";
import {
  buildInstitutionHref,
  buildListHref,
  getTypeLabel,
  normalizeCountryCode,
  normalizeType,
} from "./utils";

type Props = {
  cc: string;
  type: InstType;
  initialItems: UniversityPreviewItem[];
};

export function StaticInstitutionsPreviewSection({
  cc,
  type,
  initialItems,
}: Props) {
  const ccNorm = normalizeCountryCode(cc);
  const typeNorm = normalizeType(type);
  const title = getTypeLabel(typeNorm);
  const listHref = buildListHref(ccNorm, typeNorm);
  const base = `/${ccNorm}/${typeNorm}`;
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

      {initialItems.length === 0 ? (
        <PreviewEmpty />
      ) : (
        <>
          <div
            className={
              isUniversityPreview
                ? "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:gap-6"
                : "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8"
            }
          >
            {initialItems.map((u, index) => {
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
