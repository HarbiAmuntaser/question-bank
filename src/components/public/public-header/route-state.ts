import type { InstitutionType } from "@/config/regions";
import { SUPPORTED_COUNTRIES } from "@/config/regions";
import { normalizeCountry, isInstitutionTypeSegment } from "@/lib/route-helpers";

export type RouteState = {
  currentCC: string;
  currentType?: InstitutionType;
  secondSegment?: string;
  isCountryScoped: boolean;
};

export function getRouteState(pathname: string): RouteState {
  const safePath = pathname || "/";
  const parts = safePath.split("/").filter(Boolean);
  const isCountryScoped = Object.hasOwn(SUPPORTED_COUNTRIES, parts[0]?.toUpperCase() ?? "");
  const currentCC = normalizeCountry(isCountryScoped ? parts[0] : undefined);

  const seg2 = isCountryScoped ? parts[1] ?? "" : "";
  const currentType = isInstitutionTypeSegment(seg2)
    ? (seg2.toLowerCase() as InstitutionType)
    : undefined;

  return { currentCC, currentType, secondSegment: seg2 || undefined, isCountryScoped };
}

export function isActiveLink(pathname: string, href: string, key?: string) {
  if (key === "home") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}
