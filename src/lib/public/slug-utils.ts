// file: src/lib/public/slug-utils.ts
export function normalizeSegments(parts: string[] | undefined) {
  return (parts ?? [])
    .map((p) => decodeURIComponent(p).trim())
    .filter(Boolean);
}

export function joinSlug(parts: string[]) {
  return parts
    .join("/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\s*\/\s*/g, "/");
}

export function stripPrefix(raw: string, prefixAr: string) {
  return (raw || "")
    .trim()
    .replace(new RegExp(`^${prefixAr}\\s*\\/\\s*`, "u"), "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

// يحافظ على "/" ويشفر كل جزء
export function encodeSlugPath(slugPath: string) {
  return (slugPath || "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
}

export function findIndexCI(segs: string[], needle: string) {
  const n = needle.toLowerCase();
  return segs.findIndex((s) => s.toLowerCase() === n);
}
