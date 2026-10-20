export const DETECTED_COUNTRY_COOKIE = "detected_cc";
export const DETECTED_COUNTRY_MAX_AGE = 60 * 60 * 24;

export function detectedCountryFromCookie(cookieHeader: string): string | null {
  const encodedValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DETECTED_COUNTRY_COOKIE}=`))
    ?.slice(DETECTED_COUNTRY_COOKIE.length + 1);

  if (!encodedValue) return null;

  try {
    const value = decodeURIComponent(encodedValue).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function shouldShowCountrySwitcher(detectedCountry: string | null | undefined) {
  // An unknown location must not expose a country switch to a Saudi visitor.
  return Boolean(detectedCountry && detectedCountry !== "SA");
}
