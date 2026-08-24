import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TTL } from "@/lib/cache-tags";
import { isPublicSubjectId } from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

function normalizeSlug(parts: string[]) {
  const clean = (parts ?? []).map((p) => decodeURIComponent(p).trim()).filter(Boolean);
  const slugPath = clean.join("/").replace(/^\/+|\/+$/g, "");
  const last = clean[clean.length - 1] ?? slugPath;

  const noLeadingSlash = slugPath.replace(/^\/+/, "");
  const noPrefix = slugPath.replace(/^مواد\//, "");

  const variants = Array.from(
    new Set([slugPath, noLeadingSlash, noPrefix, noPrefix.replace(/^\/+/, "")].filter(Boolean))
  );

  return { slugPath, variants, last };
}

export async function GET(_req: Request, ctx: { params: any }) {
  const params = await (ctx as any).params; // ✅ Next 15

  const slugAny = params?.slug;
  const slugArr = Array.isArray(slugAny) ? slugAny : typeof slugAny === "string" ? [slugAny] : [];

  const { slugPath, variants, last } = normalizeSlug(slugArr);
  if (!slugPath) return bad("missing_slug", undefined, 400);

  try {
    const seo =
      (await prisma.seoMeta.findFirst({
        where: { ownerType: "subject", locale: "ar", slug: { in: variants } },
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
      })) ||
      (await prisma.seoMeta.findFirst({
        where: { ownerType: "subject", locale: "ar", slug: { endsWith: last } },
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
      }));

    if (!seo) return bad("not_found", undefined, 404);
    if (!(await isPublicSubjectId(seo.ownerId))) return bad("not_found", undefined, 404);

    const headers = new Headers({ "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicLong) });
    return json({ data: seo }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_seo");
  }
}
