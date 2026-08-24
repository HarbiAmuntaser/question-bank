import {
  SUPPORTED_COUNTRIES,
  type CountryCode,
  type InstitutionType,
} from "@/config/regions";

/** Public-only release flags. Admin and stored institution types are unaffected. */
export const schoolEnabled = process.env.NEXT_PUBLIC_SCHOOL_ENABLED === "true";

export const PUBLIC_INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  university: "الجامعات",
  school: "المدارس",
  academy: "المسارات التدريبية",
};

export function isPublicInstitutionTypeEnabled(type: unknown): type is InstitutionType {
  return (
    type === "university" ||
    type === "academy" ||
    (type === "school" && schoolEnabled)
  );
}

export function getEnabledPublicTypes(cc?: CountryCode): InstitutionType[] {
  const configuredTypes = cc
    ? SUPPORTED_COUNTRIES[cc].types
    : (Object.values(SUPPORTED_COUNTRIES).flatMap((country) => country.types) as InstitutionType[]);

  return Array.from(new Set(configuredTypes)).filter(isPublicInstitutionTypeEnabled);
}

export function getDefaultPublicType(cc: CountryCode): InstitutionType {
  const enabledTypes = getEnabledPublicTypes(cc);
  const configuredDefault = SUPPORTED_COUNTRIES[cc].defaultType;

  if (enabledTypes.includes(configuredDefault)) return configuredDefault;

  const fallback = enabledTypes[0];
  if (!fallback) throw new Error(`no_enabled_public_institution_types:${cc}`);
  return fallback;
}

export function formatArabicList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} و${items[1]}`;
  return `${items.slice(0, -1).join("، ")}، و${items.at(-1)}`;
}

export function getEnabledPublicTypeLabels(cc?: CountryCode): string[] {
  return getEnabledPublicTypes(cc).map((type) => PUBLIC_INSTITUTION_TYPE_LABELS[type]);
}

export function getPublicVisibilityCacheKey(): string {
  return schoolEnabled ? "schools-enabled" : "schools-disabled";
}
