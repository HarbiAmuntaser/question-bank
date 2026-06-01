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

export function StaticInstitutionsPreviewSection({ cc, type, initialItems }: Props) {
  const ccNorm = normalizeCountryCode(cc);
  const typeNorm = normalizeType(type);
  const title = getTypeLabel(typeNorm);
  const listHref = buildListHref(ccNorm, typeNorm);
  const base = `/${ccNorm}/${typeNorm}`;

  return (
    <section className="container py-8 sm:py-12" aria-labelledby={`preview-${typeNorm}`}>
      <InstitutionsSectionHeader id={`preview-${typeNorm}`} title={title} />

      {initialItems.length === 0 ? (
        <PreviewEmpty />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
            {initialItems.map((u) => {
              const href = buildInstitutionHref(base, {
                id: u.id,
                code: u.code ?? null,
                seo: u.seo ?? null,
                seoSlug: u.seoSlug ?? null,
              });

              return (
                <div key={u.id} className="group">
                  <InstitutionPreviewCard
                    name={u.name}
                    logoUrl={u.logoUrl ?? null}
                    code={u.code ?? null}
                    city={u.city ?? null}
                    region={u.region ?? null}
                    href={href}
                  />
                </div>
              );
            })}
          </div>

          <InstitutionsSectionFooter href={listHref} ariaLabel={`عرض كل ${title}`} />
        </>
      )}
    </section>
  );
}
