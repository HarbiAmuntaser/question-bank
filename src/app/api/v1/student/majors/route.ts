// src/app/api/v1/student/majors/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { cacheTags, CACHE_CONTROL, CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { unstable_cache } from "next/cache";
import { getPublicVisibilityCacheKey } from "@/config/public-features";
import { publicMajorWhere } from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

const listMajorsCached = (universityId?: string) =>
  unstable_cache(
    async () =>
      prisma.major.findMany({
        where: {
          isActive: true,
          ...publicMajorWhere(),
          ...(universityId ? { universityId } : {}),
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          universityId: true,
          degreeType: true,
        },
      }),
    ["student-majors-list", universityId ?? "", getPublicVisibilityCacheKey()],
    {
      revalidate: CACHE_TTL.publicStable,
      tags: cacheTags(
        "student-majors",
        CACHE_TAGS.public.majors,
        universityId ? CACHE_TAGS.public.majorsByUniversity(universityId) : null
      ),
    }
  )();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const universityId = searchParams.get("universityId") || undefined;

    const data = await listMajorsCached(universityId);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicStable),
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_majors");
  }
}
