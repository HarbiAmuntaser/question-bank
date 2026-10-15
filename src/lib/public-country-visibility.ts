import type { CountryCode } from "@/config/regions";

export const DETECTED_COUNTRY_COOKIE = "detected_cc";
export const DETECTED_COUNTRY_MAX_AGE = 60 * 60 * 24;

export function detectedCountryFromCookie(cookieHeader: string): CountryCode | null {
  const encodedValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DETECTED_COUNTRY_COOKIE}=`))
    ?.slice(DETECTED_COUNTRY_COOKIE.length + 1);

  if (!encodedValue) return null;

  try {
    const value = decodeURIComponent(encodedValue).trim().toUpperCase();
    return value === "SA" || value === "YE" ? value : null;
  } catch {
    return null;
  }
}

export function shouldShowCountrySwitcher(
  pathname: string,
  detectedCountry: CountryCode | null | undefined
) {
  const isSaudiPath = /^\/SA(?:\/|$)/i.test(pathname);
  if (!isSaudiPath) return true;

  // Keep the Saudi header stable during hydration. Yemen/unknown visitors
  // receive the switcher as soon as the non-sensitive geo cookie is read.
  if (typeof detectedCountry === "undefined") return false;
  return detectedCountry !== "SA";
}
