import { MAX_SEO_SCHEMA_JSON_BYTES, parseSeoSchemaJson } from "@/lib/seo-schema-json"

export const MAX_SEO_IMPORT_BYTES = MAX_SEO_SCHEMA_JSON_BYTES

const IMPORT_FIELDS = [
  "metaTitle",
  "metaDescription",
  "ogTitle",
  "ogDescription",
  "ogImageUrl",
  "canonicalUrl",
  "noindex",
  "nofollow",
  "schemaJson",
] as const

export type SeoImportField = (typeof IMPORT_FIELDS)[number]
export type SeoImportData = {
  metaTitle?: string | null
  metaDescription?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImageUrl?: string | null
  canonicalUrl?: string | null
  noindex?: boolean
  nofollow?: boolean
  schemaJson?: string | null
}
export type SeoImportResult =
  | { ok: true; data: SeoImportData; fields: SeoImportField[] }
  | { ok: false; error: string }

const textLimits: Partial<Record<SeoImportField, number>> = {
  metaTitle: 160,
  metaDescription: 320,
  ogTitle: 160,
  ogDescription: 320,
  ogImageUrl: 500,
  canonicalUrl: 500,
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function parseSeoImportText(text: string): SeoImportResult {
  if (new TextEncoder().encode(text).byteLength > MAX_SEO_IMPORT_BYTES) {
    return { ok: false, error: "ملف الاستيراد أكبر من 64KB." }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: "ملف JSON غير صالح." }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "يجب أن يحتوي الاستيراد على سجل JSON واحد." }
  }

  const record = parsed as Record<string, unknown>
  const unknownFields = Object.keys(record).filter(
    (key) => !IMPORT_FIELDS.includes(key as SeoImportField),
  )
  if (unknownFields.length > 0) {
    return { ok: false, error: `حقول غير مدعومة: ${unknownFields.join(", ")}` }
  }

  const data: SeoImportData = {}
  const fields: SeoImportField[] = []

  for (const field of IMPORT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) continue
    const value = record[field]

    if (field === "noindex" || field === "nofollow") {
      if (typeof value !== "boolean") {
        return { ok: false, error: `${field} يجب أن تكون true أو false.` }
      }
      data[field] = value
      fields.push(field)
      continue
    }

    if (field === "schemaJson") {
      const schema = parseSeoSchemaJson(value)
      if (!schema.ok) return { ok: false, error: "Schema JSON-LD غير صالح أو كبير جدًا." }
      data.schemaJson = schema.value === null ? "" : JSON.stringify(schema.value, null, 2)
      fields.push(field)
      continue
    }

    if (value !== null && typeof value !== "string") {
      return { ok: false, error: `${field} يجب أن يكون نصًا أو null.` }
    }
    const normalized = typeof value === "string" ? value.trim() : null
    const limit = textLimits[field]
    if (normalized && limit && normalized.length > limit) {
      return { ok: false, error: `${field} يتجاوز الحد الأقصى (${limit}).` }
    }
    if ((field === "ogImageUrl" || field === "canonicalUrl") && normalized && !isHttpUrl(normalized)) {
      return { ok: false, error: `${field} يجب أن يكون رابط HTTP أو HTTPS صالحًا.` }
    }
    data[field] = normalized
    fields.push(field)
  }

  if (fields.length === 0) return { ok: false, error: "لا توجد حقول SEO قابلة للاستيراد." }
  return { ok: true, data, fields }
}
