// src/app/api/v1/admin/seo-meta/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateSeoCache } from "@/lib/cache-invalidation";
import { Prisma } from "@prisma/client"; // ✅ ليس type
import { createSeoMetaSchema, listSeoMetaQuerySchema } from "@/validations/seo-meta";

function cleanNullable(value: string | null | undefined) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ✅ Discriminated union -> يحل خط TS على schemaJsonResult.error
type SchemaJsonParseResult =
  | { ok: true; provided: false; value?: undefined }
  | { ok: true; provided: true; value: any | null }
  | { ok: false; error: "invalid_schema_json" };

function parseSchemaJson(value: unknown): SchemaJsonParseResult {
  if (typeof value === "undefined") return { ok: true, provided: false };
  if (value === null) return { ok: true, provided: true, value: null };

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return { ok: true, provided: true, value: null };
    try {
      return { ok: true, provided: true, value: JSON.parse(trimmed) };
    } catch {
      return { ok: false, error: "invalid_schema_json" };
    }
  }

  return { ok: true, provided: true, value };
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const url = new URL(req.url);
  const get = (k: string) => url.searchParams.get(k) ?? undefined;

  const parsed = listSeoMetaQuerySchema.safeParse({
    ownerType: get("ownerType"),
    ownerId: get("ownerId"),
    locale: get("locale"),
    query: get("query"),
    page: get("page"),
    pageSize: get("pageSize"),
    sortBy: get("sortBy"),
    sortOrder: get("sortOrder"),
  });

  if (!parsed.success) {
    return bad("bad_query_params", parsed.error.flatten());
  }

  const { ownerType, ownerId, locale, query, page, pageSize, sortBy, sortOrder } = parsed.data;

  const andParts: Prisma.SeoMetaWhereInput[] = [];
  if (ownerType) andParts.push({ ownerType });
  if (ownerId) andParts.push({ ownerId });
  if (locale) andParts.push({ locale });
  if (query) {
    andParts.push({
      OR: [
        { slug: { contains: query, mode: "insensitive" } },
        { metaTitle: { contains: query, mode: "insensitive" } },
        { metaDescription: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  const where = andParts.length ? { AND: andParts } : {};

  const [rows, total] = await Promise.all([
    prisma.seoMeta.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.seoMeta.count({ where }),
  ]);

  const headers = new Headers({
    "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
  });

  return json(
    {
      data: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
    { status: 200, headers }
  );
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const rawBody = await req.json().catch(() => null);
  let body = rawBody;

  if (isRecord(rawBody) && rawBody.ownerType === "chapter" && typeof rawBody.ownerId === "string") {
    const chapter = await prisma.chapter.findUnique({
      where: { id: rawBody.ownerId },
      select: { slug: true },
    });
    if (!chapter) return bad("seo_owner_not_found", undefined, 404);

    const chapterSlug = chapter.slug?.trim();
    if (!chapterSlug) return bad("chapter_slug_required");
    body = { ...rawBody, slug: chapterSlug };
  }

  const parsed = createSeoMetaSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const schemaJsonResult = parseSchemaJson(parsed.data.schemaJson);
  if (!schemaJsonResult.ok) return bad(schemaJsonResult.error);

  // ✅ Normalize slug حسب اللغة:
  // en => lowercase دائماً
  // ar => نحفظ كما هو (trim فقط)
  const normalizedSlug =
    parsed.data.locale === "en" ? parsed.data.slug.trim().toLowerCase() : parsed.data.slug.trim();

  try {
    const created = await prisma.seoMeta.create({
      data: {
        ownerType: parsed.data.ownerType,
        ownerId: parsed.data.ownerId,
        locale: parsed.data.locale,
        slug: normalizedSlug,
        metaTitle: cleanNullable(parsed.data.metaTitle),
        metaDescription: cleanNullable(parsed.data.metaDescription),
        ogTitle: cleanNullable(parsed.data.ogTitle),
        ogDescription: cleanNullable(parsed.data.ogDescription),
        ogImageUrl: cleanNullable(parsed.data.ogImageUrl),
        canonicalUrl: cleanNullable(parsed.data.canonicalUrl),
        noindex: parsed.data.noindex ?? false,
        nofollow: parsed.data.nofollow ?? false,
        schemaJson: schemaJsonResult.provided ? schemaJsonResult.value ?? null : null,
      },
    });

    revalidateSeoCache({ ownerType: created.ownerType, ownerId: created.ownerId });
    return json({ data: created, message: "seo_meta_created" }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return bad("seo_meta_unique_constraint", undefined, 409);
    }
    throw error;
  }
}
