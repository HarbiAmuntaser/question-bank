export type AuthPortal = "student" | "admin";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_BYTES = 72;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function safeCallbackPath(value: unknown, portal: AuthPortal = "student"): string {
  const fallback = portal === "admin" ? "/admin" : "/account";
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    // Reject encoded separators/control characters before URL normalization.
    let decoded = value;
    for (let i = 0; i < 3; i++) {
      if (/[\\\u0000-\u0020\u007f]/.test(decoded) || decoded.startsWith("//")) return fallback;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (/%[0-9a-f]{2}|[\\\u0000-\u0020\u007f]/i.test(decoded)) return fallback;
    const url = new URL(value, "https://callback.invalid");
    const decodedUrl = new URL(decoded, "https://callback.invalid");
    if (url.origin !== "https://callback.invalid" || decodedUrl.origin !== url.origin) return fallback;
    const path = decodedUrl.pathname.toLowerCase();
    const adminPath = path === "/admin" || path.startsWith("/admin/");
    if (portal === "admin" && !adminPath) return fallback;
    if (portal === "student" && (adminPath || /^\/(api|auth|_next)(\/|$)/.test(path))) return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}

export function safeAuthRedirect(value: string, baseUrl: string): string {
  try {
    const origin = new URL(baseUrl).origin;
    if (/[\\\u0000-\u0020\u007f]/.test(value) || value.startsWith("//")) return origin;
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password) return origin;
    const path = url.pathname + url.search;
    // Fixed auth destinations are also needed for explicit sign-out.
    if (["/auth/signin", "/auth/admin/signin", "/auth/forbidden"].includes(url.pathname)) return origin + url.pathname;
    const portal = /^\/admin(\/|$)/.test(url.pathname) ? "admin" : "student";
    return origin + safeCallbackPath(path, portal);
  } catch {
    return baseUrl;
  }
}
