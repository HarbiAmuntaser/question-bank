import {
  DEFAULT_COUNTRY,
  GLOBAL_ACADEMY_CANONICAL_COUNTRY,
  SUPPORTED_COUNTRIES,
  type CountryCode,
  type InstitutionType,
} from "@/config/regions";

type InstitutionRouteRecord = {
  countryCode?: unknown;
  institutionType?: unknown;
  visibility?: unknown;
};

function supportedCountry(value: unknown): CountryCode | null {
  const country = String(value ?? "").trim().toUpperCase() as CountryCode;
  return country in SUPPORTED_COUNTRIES ? country : null;
}

function supportedType(value: unknown): InstitutionType | null {
  const type = String(value ?? "").trim().toLowerCase();
  return type === "university" || type === "school" || type === "academy" ? type : null;
}

export function isGlobalAcademy(record: InstitutionRouteRecord | null | undefined) {
  return record?.institutionType === "academy" && record.visibility === "global";
}

export function getCanonicalInstitutionCountry(
  record: InstitutionRouteRecord | null | undefined,
  requestedCountry?: unknown,
): CountryCode {
  if (isGlobalAcademy(record)) return GLOBAL_ACADEMY_CANONICAL_COUNTRY;
  return supportedCountry(record?.countryCode) ?? supportedCountry(requestedCountry) ?? DEFAULT_COUNTRY;
}

export function getCanonicalInstitutionType(
  record: InstitutionRouteRecord | null | undefined,
  requestedType?: unknown,
): InstitutionType {
  return supportedType(record?.institutionType) ?? supportedType(requestedType) ?? "university";
}
