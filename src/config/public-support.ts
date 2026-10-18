export const OFFICIAL_SUPPORT_EMAIL = "mustawak.site@gmail.com";

export function supportEmailHref(subject?: string) {
  const params = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${OFFICIAL_SUPPORT_EMAIL}${params}`;
}
