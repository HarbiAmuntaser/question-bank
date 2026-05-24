// file: src/lib/server/student-fetch.ts
import "server-only";
import { headers } from "next/headers";

export async function apiBase() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function fetchJSON<T>(url: string, init?: RequestInit, revalidate = 300) {
  const base = await apiBase();
  const abs = url.startsWith("http") ? url : `${base}${url}`;

  const res = await fetch(abs, {
    ...init,
    next: { revalidate, ...(init as any)?.next },
  });

  if (!res.ok) {
    return { ok: false as const, status: res.status, data: null as T | null };
  }

  const json = (await res.json()) as any;
  return { ok: true as const, status: res.status, data: (json?.data as T) ?? null };
}
