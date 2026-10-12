export const MAX_SEO_SCHEMA_JSON_BYTES = 64 * 1024

const MAX_SCHEMA_DEPTH = 20
const MAX_SCHEMA_NODES = 2_000
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"])

export type SeoSchemaJsonResult =
  | { ok: true; provided: false; value?: undefined }
  | { ok: true; provided: true; value: Record<string, unknown> | unknown[] | null }
  | { ok: false; error: "invalid_schema_json" | "schema_json_too_large" | "schema_json_too_complex" }

function inspectJson(value: unknown, depth: number, state: { nodes: number }): boolean {
  state.nodes += 1
  if (state.nodes > MAX_SCHEMA_NODES || depth > MAX_SCHEMA_DEPTH) return false

  if (Array.isArray(value)) {
    return value.every((entry) => inspectJson(entry, depth + 1, state))
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value).every(
      ([key, entry]) => !FORBIDDEN_KEYS.has(key) && inspectJson(entry, depth + 1, state),
    )
  }

  return value === null || ["string", "number", "boolean"].includes(typeof value)
}

export function parseSeoSchemaJson(value: unknown): SeoSchemaJsonResult {
  if (typeof value === "undefined") return { ok: true, provided: false }
  if (value === null || value === "") return { ok: true, provided: true, value: null }

  let parsed: unknown = value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return { ok: true, provided: true, value: null }
    if (new TextEncoder().encode(trimmed).byteLength > MAX_SEO_SCHEMA_JSON_BYTES) {
      return { ok: false, error: "schema_json_too_large" }
    }
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return { ok: false, error: "invalid_schema_json" }
    }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "invalid_schema_json" }
  }

  let serialized: string
  try {
    serialized = JSON.stringify(parsed)
  } catch {
    return { ok: false, error: "invalid_schema_json" }
  }

  if (new TextEncoder().encode(serialized).byteLength > MAX_SEO_SCHEMA_JSON_BYTES) {
    return { ok: false, error: "schema_json_too_large" }
  }
  if (!inspectJson(parsed, 0, { nodes: 0 })) {
    return { ok: false, error: "schema_json_too_complex" }
  }

  return {
    ok: true,
    provided: true,
    value: parsed as Record<string, unknown> | unknown[],
  }
}
