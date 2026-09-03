// file: src/app/api/v1/student/majors/by-slug/[...slug]/route.ts
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import {
  getPublicMajorBySlug,
  normalizePublicMajorSlug,
} from "@/lib/server/public-majors";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string[] | string }> }
) {
  // ✅ Next 15: لازم await
  const { slug } = await ctx.params;

  const slugArr = Array.isArray(slug) ? slug : typeof slug === "string" ? [slug] : [];
  const normalizedSlug = normalizePublicMajorSlug(slugArr);

  if (!normalizedSlug.slugPath) return bad("missing_slug", undefined, 400);

  try {
    const data = await getPublicMajorBySlug(normalizedSlug);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_major_by_slug");
  }
}
