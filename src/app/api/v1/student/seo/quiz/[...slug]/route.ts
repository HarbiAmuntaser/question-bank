/* Fixed Next 15 params typing */

import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { getPublicQuizSeoBySlug } from "@/lib/server/public-seo";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string[] };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params;
  if (!(slug ?? []).some((part) => String(part).trim())) return bad("missing_slug", undefined, 400);

  try {
    const seo = await getPublicQuizSeoBySlug(slug);
    if (!seo) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data: seo }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_seo");
  }
}
