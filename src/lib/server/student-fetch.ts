// file: src/lib/server/student-fetch.ts
import "server-only";
import { headers } from "next/headers";
import { CACHE_TTL } from "@/lib/cache-tags";
import { authOrigin } from "@/lib/server/auth-config";

type StudentFetchInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

function hasData<T>(value: unknown): value is { data: T } {
  return typeof value === "object" && value !== null && "data" in value;
}

export async function apiBase() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/** Authenticated content reads must never forward cookies to a request-controlled host. */
export async function fetchAuthenticatedStudentJSON<T>(path: string) {
  const origin = authOrigin();
  const url = new URL(path, origin);
  if (url.origin !== origin || !url.pathname.startsWith("/api/v1/student/") || url.username || url.password) {
    throw new Error("invalid_student_api_path");
  }
  const incoming = await headers();
  return fetchJSON<T>(url.href, { cache: "no-store", headers: { cookie: incoming.get("cookie") ?? "" } }, 0);
}

export async function fetchJSON<T>(
  url: string,
  init?: StudentFetchInit,
  revalidate: number = CACHE_TTL.publicStable
) {
  const base = await apiBase();
  const abs = url.startsWith("http") ? url : `${base}${url}`;
  const shouldNoStore = init?.cache === "no-store" || revalidate === 0;
  const fetchInit: StudentFetchInit = {
    ...init,
    cache: shouldNoStore ? "no-store" : init?.cache,
  };

  if (shouldNoStore) {
    delete fetchInit.next;
  } else {
    fetchInit.next = { revalidate, ...(init?.next ?? {}) };
  }

  const res = await fetch(abs, fetchInit);

  if (!res.ok) {
    return { ok: false as const, status: res.status, data: null as T | null };
  }

  const body: unknown = await res.json().catch(() => null);
  return { ok: true as const, status: res.status, data: hasData<T>(body) ? body.data : null };
}
