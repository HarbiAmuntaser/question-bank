import "server-only";

import { headers as nextHeaders } from "next/headers";
import { getRequestOrigin } from "@/lib/server/request-origin";

type AdminApiFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

export async function adminApiFetch(path: string, init: AdminApiFetchInit = {}) {
  const incoming = await nextHeaders();
  const configuredOrigin = process.env.NEXTAUTH_URL;
  const production = process.env.NODE_ENV === "production";
  if (production && !configuredOrigin) {
    throw new Error("NEXTAUTH_URL_required_for_admin_api");
  }
  const base = production ? new URL(configuredOrigin!).origin : await getRequestOrigin();
  if (!production && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname)) {
    throw new Error("invalid_development_admin_origin");
  }
  const url = new URL(path, base);
  if (url.origin !== new URL(base).origin || !url.pathname.startsWith("/api/v1/admin/")) {
    throw new Error("invalid_admin_api_path");
  }
  const requestHeaders = new Headers(init.headers);
  requestHeaders.delete("x-admin-key");
  requestHeaders.delete("x-api-key");
  requestHeaders.delete("cookie");
  const cookie = incoming.get("cookie");
  if (cookie) requestHeaders.set("cookie", cookie);
  requestHeaders.set("accept", requestHeaders.get("accept") ?? "application/json");
  if (init.body && !(init.body instanceof FormData) && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  return fetch(url, {
    ...init,
    next: undefined,
    headers: requestHeaders,
    cache: "no-store",
    redirect: "error",
  });
}
