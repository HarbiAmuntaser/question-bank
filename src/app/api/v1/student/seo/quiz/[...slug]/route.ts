/* Fixed Next 15 params typing */

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string[] };
type RouteContext = {
  params: Promise<RouteParams>;
};

function normalizeSlug(parts: string[]) {
  const clean = (parts ?? []).map((p) => decodeURIComponent(p).trim()).filter(Boolean);
  return clean.join("/").replace(/^\/+|\/+$/g, "");
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params;
  const slugPath = normalizeSlug(slug);
  if (!slugPath) return bad("missing_slug", undefined, 400);

  try {
    const seo = await prisma.seoMeta.findFirst({
      where: { ownerType: "exam", locale: "ar", slug: slugPath },
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

    const headers = new Headers({
      "cache-control": "public, s-maxage=600, stale-while-revalidate=60",
    });
    return json({ data: seo }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_seo");
  }
}