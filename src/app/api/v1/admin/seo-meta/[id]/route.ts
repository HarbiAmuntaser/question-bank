// src/app/api/v1/admin/seo-meta/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad, unauth, notFound } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { updateSeoMetaSchema } from "@/validations/seo-meta";

function cleanNullable(value: string | null | undefined) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value ?? null;
}

const asciiSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const unicodeSlugRegex = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

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

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteParams) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;
  const seo = await prisma.seoMeta.findUnique({ where: { id } });
  if (!seo) return notFound("seo_meta_not_found");
  return json({ data: seo }, { status: 200 });
}

export async function PUT(req: Request, ctx: RouteParams) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;

  const existing = await prisma.seoMeta.findUnique({ where: { id } });
  if (!existing) return notFound("seo_meta_not_found");

  const body = await req.json().catch(() => null);
  const parsed = updateSeoMetaSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const schemaJsonResult = parseSchemaJson(parsed.data.schemaJson);
  if (!schemaJsonResult.ok) return bad(schemaJsonResult.error);

  // ✅ locale النهائي (لو المرسل عدله نستخدمه، وإلا الحالي)
  const finalLocale = typeof parsed.data.locale !== "undefined" ? parsed.data.locale : existing.locale;

  const data: Prisma.SeoMetaUpdateInput = {};

  if (typeof parsed.data.locale !== "undefined") data.locale = parsed.data.locale;

  // ✅ slug normalize + enforce rules by locale
  if (typeof parsed.data.slug !== "undefined") {
    const raw = parsed.data.slug.trim();

    if (!unicodeSlugRegex.test(raw)) {
      return bad("validation_error", {
        fieldErrors: { slug: ["Slug يسمح بحروف/أرقام وشرطة (-) فقط بدون مسافات"] },
        formErrors: [],
      });
    }

    if (finalLocale === "en") {
      const s = raw.toLowerCase();
      if (!asciiSlugRegex.test(s)) {
        return bad("validation_error", {
          fieldErrors: { slug: ["Slug للإنجليزية يجب أن يكون a-z/0-9 واستخدام (-) فقط"] },
          formErrors: [],
        });
      }
      data.slug = s;
    } else {
      data.slug = raw;
    }
  }

  if (Object.prototype.hasOwnProperty.call(parsed.data, "metaTitle"))
    data.metaTitle = cleanNullable(parsed.data.metaTitle);
  if (Object.prototype.hasOwnProperty.call(parsed.data, "metaDescription"))
    data.metaDescription = cleanNullable(parsed.data.metaDescription);
  if (Object.prototype.hasOwnProperty.call(parsed.data, "ogTitle"))
    data.ogTitle = cleanNullable(parsed.data.ogTitle);
  if (Object.prototype.hasOwnProperty.call(parsed.data, "ogDescription"))
    data.ogDescription = cleanNullable(parsed.data.ogDescription);
  if (Object.prototype.hasOwnProperty.call(parsed.data, "ogImageUrl"))
    data.ogImageUrl = cleanNullable(parsed.data.ogImageUrl);
  if (Object.prototype.hasOwnProperty.call(parsed.data, "canonicalUrl"))
    data.canonicalUrl = cleanNullable(parsed.data.canonicalUrl);

  if (typeof parsed.data.noindex !== "undefined") data.noindex = parsed.data.noindex;
  if (typeof parsed.data.nofollow !== "undefined") data.nofollow = parsed.data.nofollow;

  if (schemaJsonResult.provided) data.schemaJson = schemaJsonResult.value ?? null;

  try {
    const updated = await prisma.seoMeta.update({ where: { id }, data });
    revalidateTag("seo-meta");
    return json({ data: updated, message: "seo_meta_updated" }, { status: 200 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return bad("seo_meta_unique_constraint", undefined, 409);
    }
    throw error;
  }
}

export async function DELETE(req: Request, ctx: RouteParams) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;

  const existing = await prisma.seoMeta.findUnique({ where: { id } });
  if (!existing) return notFound("seo_meta_not_found");

  await prisma.seoMeta.delete({ where: { id } });
  revalidateTag("seo-meta");
  return json({ message: "seo_meta_deleted" }, { status: 200 });
}
