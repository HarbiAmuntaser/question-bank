/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TTL } from "@/lib/cache-tags";
import { isPublicUniversityId } from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string | string[] };
type RouteContext = {
  params: Promise<RouteParams>;
};

function toArray(v: string | string[] | undefined | null): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function stripUniversitiesPrefix(input: string) {
  return input.replace(/^جامعات\s*\/\s*/u, "");
}

function normalizeSlug(parts: string[]) {
  const clean = (parts ?? [])
    .map((p) => safeDecode(String(p)).trim())
    .filter(Boolean);

  const slugPath = clean.join("/").replace(/^\/+|\/+$/g, "");

  const noLeading = slugPath.replace(/^\/+/, "");
  const noPrefix = stripUniversitiesPrefix(slugPath);
  const noPrefixNoLeading = stripUniversitiesPrefix(noLeading);

  const variants = Array.from(
    new Set([slugPath, noLeading, noPrefix, noPrefixNoLeading].map((x) => x.trim()).filter(Boolean))
  );

  return { slugPath, variants };
}

export async function GET(_req: Request, { params }: RouteContext) {
  const rawParams = await params;
  const slugArr = toArray(rawParams?.slug);

  const { slugPath, variants } = normalizeSlug(slugArr);
  if (!slugPath) return bad("missing_slug", undefined, 400);

  try {
    const seo = await prisma.seoMeta.findFirst({
      where: { ownerType: "university", locale: "ar", slug: { in: variants } },
      select: {
        id: true,
        ownerId: true,
        slug: true,
        locale: true,
        metaTitle: true,
        metaDescription: true,
        ogTitle: true,
        ogDescription: true,
        ogImageUrl: true,
        canonicalUrl: true,
        noindex: true,
        nofollow: true,
        schemaJson: true,
      },
    });

    if (!seo) return bad("not_found", undefined, 404);
    if (!(await isPublicUniversityId(seo.ownerId))) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicLong),
    });
    return json({ data: seo }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_seo");
  }
}
