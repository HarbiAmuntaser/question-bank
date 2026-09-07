import "server-only";

import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import type { CountryCode, InstitutionType } from "@/config/regions";
import {
  getPublicVisibilityCacheKey,
  isPublicInstitutionTypeEnabled,
} from "@/config/public-features";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

function institutionCategoryWhere(
  countryCode: CountryCode,
  institutionType: InstitutionType,
): Prisma.UniversityWhereInput {
  const countryVisibility =
    institutionType === "academy"
      ? { OR: [{ countryCode }, { visibility: "global" as const }] }
      : { countryCode };

  return {
    isActive: true,
    institutionType,
    AND: [countryVisibility],
  };
}

export async function hasPublicInstitutionCategory(
  countryCode: CountryCode,
  institutionType: InstitutionType,
) {
  if (!isPublicInstitutionTypeEnabled(institutionType)) return false;

  return unstable_cache(
    async () => {
      const institution = await prisma.university.findFirst({
        where: institutionCategoryWhere(countryCode, institutionType),
        select: { id: true },
      });

      return Boolean(institution);
    },
    [
      "public-institution-category-availability",
      countryCode,
      institutionType,
      getPublicVisibilityCacheKey(),
    ],
    {
      revalidate: CACHE_TTL.publicStable,
      tags: [
        CACHE_TAGS.public.institutions,
        CACHE_TAGS.public.institutionsCountry(countryCode),
      ],
    },
  )();
}
