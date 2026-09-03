import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import {
  getPublicUniversityByCode,
  normalizePublicUniversityCode,
} from "@/lib/server/public-universities";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await ctx.params;
  if (!rawCode) return bad("missing_code", undefined, 400);

  const normalizedCode = normalizePublicUniversityCode(rawCode);
  if (!normalizedCode.clean) return bad("missing_code", undefined, 400);

  try {
    const data = await getPublicUniversityByCode(normalizedCode);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_university_by_code");
  }
}
