import "server-only";
import { json as baseJson } from "@/lib/http";

export function json<T>(data: T, init: number | ResponseInit = 200, extraHeaders?: HeadersInit) {
  const response = baseJson(data, init, extraHeaders);
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export const bad = (message: string, details?: unknown, status = 400) =>
  json({ error: message, details }, status);
export const notFound = (message = "غير موجود") => json({ error: message }, 404);
export const notfound = (message = "not_found") => json({ error: message }, 404);
