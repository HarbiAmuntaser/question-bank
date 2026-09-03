/* Fixed Next 15 params typing */

import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import {
  getPublicUniversityBySlug,
  normalizePublicUniversitySlug,
} from "@/lib/server/public-universities";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string[] | string };
type RouteContext = {
  params: Promise<RouteParams>;
};

function toArray(v: string | string[] | undefined | null): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export async function GET(_req: Request, { params }: RouteContext) {
  const rawParams = await params;
  const slugArr = toArray(rawParams?.slug);

  const normalizedSlug = normalizePublicUniversitySlug(slugArr);
  if (!normalizedSlug.slugPath) return bad("missing_slug", undefined, 400);

  try {
    const data = await getPublicUniversityBySlug(normalizedSlug);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_university_by_slug");
  }
}
