export function json<T>(data: T, init: number | ResponseInit = 200, extraHeaders?: HeadersInit) {
const responseInit = typeof init === "number" ? { status: init, headers: extraHeaders } : init;
const headers = new Headers(responseInit.headers);
headers.set("content-type", "application/json; charset=utf-8");
return new Response(JSON.stringify(data), {
...responseInit,
headers,
});
}
export const bad = (m: string, d?: unknown, status = 400) => json({ error: m, details: d }, status);
export const unauth = (m = "غير مصرح") => json({ error: m }, 401);
export const notFound = (m = "غير موجود") => json({ error: m }, 404);
// file: src/lib/http.ts
// ... (باقي الدوال مثل json/bad/unauth)

import { NextResponse } from "next/server";

/**
 * notfound
 * --------
 * Response جاهز لـ 404 بنفس أسلوب helpers عندك.
 * فائدته: تقدر تستخدمه في API routes بدل تكرار NextResponse.json كل مرة.
 */
export function notfound(message = "not_found") {
  return NextResponse.json({ error: message }, { status: 404 });
}
