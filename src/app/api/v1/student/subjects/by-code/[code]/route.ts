import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import {
  getPublicSubjectByCode,
  normalizePublicSubjectCode,
  toPublicSubjectDetails,
} from "@/lib/server/public-subjects";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const params = await ctx.params;
  const code = normalizePublicSubjectCode(params.code);

  if (!code) return bad("missing_code", undefined, 400);

  try {
    const subject = await getPublicSubjectByCode(code);
    const data = subject ? toPublicSubjectDetails(subject) : null;
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_subject_by_code");
  }
}
