// file: src/middleware.ts
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  normalizeCountry,
  detectCountryFromHeaders,
  isInstitutionTypeSegment,
} from "@/lib/route-helpers";

import { DEFAULT_COUNTRY, type CountryCode, type InstitutionType } from "@/config/regions";

const SECURE_MAX_AGE = 60 * 60 * 24 * 365;

function applySecurityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

function isBypassedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|map|txt|json|woff2?)$/) !== null
  );
}

// /{cc}/(something)/(rest...)
function parsePublicPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return {
    ccRaw: parts[0] ?? "",
    seg2: parts[1] ?? "",
    rest: parts.slice(2).join("/"),
  };
}

// ✅ المهم: لا نعتبر أول segment دولة إلا إذا كان فعلاً دولة مدعومة
function isCountrySegment(seg: string) {
  if (!seg) return false;
  if (seg.length !== 2) return false; // مثل SA, YE
  const norm = normalizeCountry(seg);
  return norm === seg.toUpperCase(); // لو غير مدعوم normalizeCountry سيعيد DEFAULT → تفشل
}

function publicMiddleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 0) لا نتدخل في API أو الأصول الثابتة
    if (isBypassedPath(pathname)) {
      const passthrough = NextResponse.next();
      applySecurityHeaders(passthrough);
      return passthrough;
    }

    // 1) قراءة الدولة من الكوكيز
    const cookieCC = req.cookies.get("cc")?.value;

    // 2) محاولة استنتاج الدولة من Geo headers
    const geoCC = detectCountryFromHeaders(req);

    // 3) الدولة النهائية
    const chosenCC = normalizeCountry(cookieCC || geoCC || DEFAULT_COUNTRY);

    // 4) "/" → "/{cc}"
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = `/${chosenCC}`;

      const res = NextResponse.redirect(url);
      res.cookies.set("cc", chosenCC, { path: "/", maxAge: SECURE_MAX_AGE, sameSite: "lax" });
      applySecurityHeaders(res);
      return res;
    }

    const { ccRaw, seg2, rest } = parsePublicPath(pathname);

    // ✅ لو أول جزء ليس دولة (مثل /quiz أو /admin) → لا نطبّق منطق الدول إطلاقاً
    if (!isCountrySegment(ccRaw)) {
      const res = NextResponse.next();
      applySecurityHeaders(res);
      return res;
    }

    // 5) الآن نحن متأكدين أن المسار يبدأ بـ cc صحيح
    const cc = normalizeCountry(ccRaw) as CountryCode;

    // (أ) تطبيع cc: /sa -> /SA
    if (ccRaw !== cc) {
      const url = req.nextUrl.clone();
      url.pathname = seg2
        ? `/${cc}/${seg2}${rest ? `/${rest}` : ""}`
        : `/${cc}`;

      const res = NextResponse.redirect(url);
      res.cookies.set("cc", cc, { path: "/", maxAge: SECURE_MAX_AGE, sameSite: "lax" });
      applySecurityHeaders(res);
      return res;
    }

    // (ب) تطبيع type فقط لو كان نوع مؤسسة فعلاً
    if (seg2 && isInstitutionTypeSegment(seg2) && seg2 !== seg2.toLowerCase()) {
      const url = req.nextUrl.clone();
      const typeNorm = seg2.toLowerCase() as InstitutionType;
      url.pathname = `/${cc}/${typeNorm}${rest ? `/${rest}` : ""}`;

      const res = NextResponse.redirect(url);
      res.cookies.set("cc", cc, { path: "/", maxAge: SECURE_MAX_AGE, sameSite: "lax" });
      res.cookies.set("inst", typeNorm, { path: "/", maxAge: SECURE_MAX_AGE, sameSite: "lax" });
      applySecurityHeaders(res);
      return res;
    }

    // (ج) مسار طبيعي → نثبت الكوكيز
    const res = NextResponse.next();
    res.cookies.set("cc", cc, { path: "/", maxAge: SECURE_MAX_AGE, sameSite: "lax" });

    if (seg2 && isInstitutionTypeSegment(seg2)) {
      res.cookies.set("inst", seg2.toLowerCase(), { path: "/", maxAge: SECURE_MAX_AGE, sameSite: "lax" });
    }

    applySecurityHeaders(res);
    return res;
}

const adminMiddleware = withAuth(
  function adminOnlyMiddleware() {
    const res = NextResponse.next();
    applySecurityHeaders(res);
    return res;
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  }
);

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (req.nextUrl.pathname.startsWith("/admin")) {
    return adminMiddleware(req as NextRequestWithAuth, event);
  }

  return publicMiddleware(req);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/",
    "/((?!api|_next|static|assets|favicon.ico|.*\\..*).*)",
  ],
};

