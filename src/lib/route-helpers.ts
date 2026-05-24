// file: src/lib/route-helpers.ts
/**
 * دوال مساعدة لمسارات البلد/النوع:
 * - normalizeCountry: توحيد cc والتأكد أنه مدعوم
 * - isSupportedType: التحقق أن type مدعوم داخل دولة معينة
 * - buildPath: بناء مسارات /{cc} أو /{cc}/{type} أو مع rest
 * - detectCountryFromHeaders: محاولة تحديد الدولة من Geo-IP headers (لـ middleware)
 */

import type { NextRequest } from "next/server";
import {
  DEFAULT_COUNTRY,
  SUPPORTED_COUNTRIES,
  type CountryCode,
  type InstitutionType,
} from "@/config/regions";

// توحيد كود الدولة وإرجاع الافتراضي إن لم يكن مدعوم
export function normalizeCountry(input?: string | null): CountryCode {
  const cc = (input ?? "").trim().toUpperCase() as CountryCode;
  return (cc && cc in SUPPORTED_COUNTRIES ? cc : DEFAULT_COUNTRY) as CountryCode;
}

// هل هذا النص يمثل نوع مؤسسة؟ (مفيد للهيدر/المسارات)
export function isInstitutionTypeSegment(seg?: string | null): seg is InstitutionType {
  const t = (seg ?? "").trim().toLowerCase();
  return t === "university" || t === "school" || t === "academy";
}

// هل النوع مدعوم ضمن الدولة؟
export function isSupportedType(type?: string | null, cc?: string | null): type is InstitutionType {
  const country = normalizeCountry(cc);
  const t = (type ?? "").trim().toLowerCase();
  return SUPPORTED_COUNTRIES[country].types.includes(t as InstitutionType);
}

// النوع الافتراضي لدولة معينة
export function defaultTypeFor(cc?: string | null): InstitutionType {
  const country = normalizeCountry(cc);
  return SUPPORTED_COUNTRIES[country].defaultType;
}

/**
 * بناء مسار آمن:
 * - buildPath("SA")                       => "/SA"
 * - buildPath("SA", "university")         => "/SA/university"
 * - buildPath("SA", "university", "x/y")  => "/SA/university/x/y"
 */
export function buildPath(cc: CountryCode, type?: InstitutionType | null, path?: string): string {
  const clean = (path ?? "").replace(/^\/+/, "");
  if (!type) return `/${cc}${clean ? `/${clean}` : ""}`;
  return `/${cc}/${type}${clean ? `/${clean}` : ""}`;
}

// محاولة تحديد الدولة من هيدرز الشبكة (Vercel/Cloudflare...)
export function detectCountryFromHeaders(req: NextRequest): CountryCode | undefined {
  const fromEdge =
    req.headers.get("x-geo-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-vercel-ip-country");

  if (!fromEdge) return undefined;

  const cc = fromEdge.trim().toUpperCase();
  if (cc in SUPPORTED_COUNTRIES) return cc as CountryCode;
  return undefined;
}
