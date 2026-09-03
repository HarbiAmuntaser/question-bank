// file: src/app/api/v1/student/majors/by-code/[code]/route.ts
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import {
  getPublicMajorByCode,
  normalizePublicMajorCode,
} from "@/lib/server/public-majors";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  // ✅ Next 15: لازم await
  const { code: rawCode } = await ctx.params;
  const code = normalizePublicMajorCode(rawCode);

  if (!code) return bad("missing_code", undefined, 400);

  try {
    const data = await getPublicMajorByCode(code);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_major_by_code");
  }
}
