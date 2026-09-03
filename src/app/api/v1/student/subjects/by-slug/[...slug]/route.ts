import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import {
  getPublicSubjectBySlug,
  normalizePublicSubjectSlug,
  toPublicSubjectDetails,
} from "@/lib/server/public-subjects";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string[] | string }> },
) {
  const params = await ctx.params;
  const slugAny = params.slug;
  const slugArr = Array.isArray(slugAny) ? slugAny : typeof slugAny === "string" ? [slugAny] : [];

  const normalizedSlug = normalizePublicSubjectSlug(slugArr);
  if (!normalizedSlug.slugPath) return bad("missing_slug", undefined, 400);

  try {
    const subject = await getPublicSubjectBySlug(normalizedSlug);
    const data = subject ? toPublicSubjectDetails(subject) : null;
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_subject_by_slug");
  }
}
