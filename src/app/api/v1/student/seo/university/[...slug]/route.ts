/* Fixed Next 15 params typing */

import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TTL } from "@/lib/cache-tags";
import { getPublicUniversitySeoBySlug } from "@/lib/server/public-seo";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string | string[] };
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
  if (!slugArr.some((part) => String(part).trim())) return bad("missing_slug", undefined, 400);

  try {
    const seo = await getPublicUniversitySeoBySlug(slugArr);
    if (!seo) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicLong),
    });
    return json({ data: seo }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_seo");
  }
}
