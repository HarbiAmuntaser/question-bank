// file: src/components/public/university-grid/utils.ts

import type { InstType, UniversityGridItem } from "./types";

export function normalizeCountryCode(cc: string) {
  return (cc || "SA").trim().toUpperCase();
}

export function normalizeType(type: InstType) {
  return (type || "university").toLowerCase() as InstType;
}

export function buildBase(cc: string, type: InstType) {
  return `/${cc}/${type}`;
}

export function buildListHref(cc: string, type: InstType) {
  return `/${cc}/${type}`;
}

export function buildUniversityHref(base: string, u: UniversityGridItem) {
  const seoSlug = u.seo?.slug ?? u.seoSlug ?? null;
  const raw = (seoSlug || u.code || u.id || "").toString();
  const cleaned = raw.replace(/^\/+/, "").replace(/\/+$/, "").replace(/^جامعات\//, "");
  return `${base}/universities/${encodeURI(cleaned)}`;
}
