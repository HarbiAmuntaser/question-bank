import "server-only";

import { headers as nextHeaders } from "next/headers";

import { getRequestOrigin } from "@/lib/server/request-origin";

type AdminApiFetchInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export async function adminApiFetch(path: string, init: AdminApiFetchInit = {}) {
  const base = await getRequestOrigin();
  const incoming = await nextHeaders();
  const requestHeaders = new Headers(init.headers);

  requestHeaders.set("accept", requestHeaders.get("accept") ?? "application/json");

  const cookie = incoming.get("cookie");
  if (cookie && !requestHeaders.has("cookie")) {
    requestHeaders.set("cookie", cookie);
  }

  // Server Components do not automatically forward the browser session to internal API calls.
  if (process.env.ADMIN_API_KEY && !requestHeaders.has("x-admin-key")) {
    requestHeaders.set("x-admin-key", process.env.ADMIN_API_KEY);
  }

  return fetch(`${base}${path}`, {
    ...init,
    headers: requestHeaders,
  });
}
