import type { InstitutionType } from "@/content/hero";

export function normalizeCc(cc?: string) {
  const value = (cc || "SA").trim().toUpperCase();
  return value === "YE" ? "YE" : "SA";
}

export function normalizeType(type?: InstitutionType): InstitutionType {
  if (type === "school" || type === "academy") return type;
  return "university";
}

export function formatBadge(template: string, countryName: string) {
  return template.replace("{{country}}", countryName);
}

export function buildHeroLinks(cc: string, type: InstitutionType) {
  return {
    browseTypeHref: `/${cc}/${type}`,
    browseAcademiesHref: `/${cc}/academy`,
    browseSchoolsHref: `/${cc}/school`,
  };
}
