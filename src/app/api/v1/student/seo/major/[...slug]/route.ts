import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TTL } from "@/lib/cache-tags";
import { getPublicMajorSeoBySlug } from "@/lib/server/public-seo";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await ctx.params;
  const slugParts = slug || [];
  if (!slugParts.some((part) => String(part).trim())) return bad("missing_slug", undefined, 400);

  try {
    const seo = await getPublicMajorSeoBySlug(slugParts);
    if (!seo) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicLong),
    });
    return json({ data: seo }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_seo");
  }
}
