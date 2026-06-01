import type { InstitutionType } from "@/config/regions";
import { normalizeCountry, isInstitutionTypeSegment } from "@/lib/route-helpers";

export type RouteState = {
  currentCC: string;
  currentType?: InstitutionType;
  secondSegment?: string;
};

export function getRouteState(pathname: string): RouteState {
  const safePath = pathname || "/";
  const parts = safePath.split("/").filter(Boolean);
  const currentCC = normalizeCountry(parts[0]);

  const seg2 = (parts[1] ?? "").toString();
  const currentType = isInstitutionTypeSegment(seg2)
    ? (seg2.toLowerCase() as InstitutionType)
    : undefined;

  return { currentCC, currentType, secondSegment: seg2 || undefined };
}

export function isActiveLink(pathname: string, href: string, key?: string) {
  if (key === "home") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}
