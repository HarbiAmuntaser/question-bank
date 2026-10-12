// src/app/api/v1/admin/universities/route.ts

import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/server/admin-http";
import { verifyAdmin, adminAuthResponse } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateUniversityCache } from "@/lib/cache-invalidation";
import {
  createUniversitySchema,
} from "@/validations/university";
import { AdminListQueryError, listAdminUniversities } from "@/lib/server/admin-content-lists";


export const dynamic = "force-dynamic";

// ---- GET /api/v1/admin/universities ----
// ---- GET /api/v1/admin/universities ----
export async function GET(req: Request) {
  const auth = await verifyAdmin(req, "universities:read");
  if (!auth.ok) return adminAuthResponse(auth);

  const url = new URL(req.url);

  const query = Object.fromEntries(url.searchParams.entries());

  let payload;
  try {
    payload = await listAdminUniversities(query);
  } catch (error) {
    if (!(error instanceof AdminListQueryError)) throw error;
    return bad("bad_query_params");
  }

  const headers = new Headers({
    "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
  });

  return json(
    {
      ...payload,
    },
    { status: 200, headers }
  );
}


// ---- POST /api/v1/admin/universities ----
export async function POST(req: Request) {
  const auth = await verifyAdmin(req, "universities:write");
  if (!auth.ok) return adminAuthResponse(auth);

  const body = await req.json().catch(() => null);
  const parsed = createUniversitySchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  try {
    const created = await prisma.university.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code ?? null,
        city: parsed.data.city ?? null,
        region: parsed.data.region ?? null,
        logoUrl: parsed.data.logoUrl ?? null,
        isActive: parsed.data.isActive,
        // عند المصادقة بمفتاح أدمن لا يوجد userId حقيقي → تجنّب انتهاك FK
        createdBy: auth.userId,

        countryCode: parsed.data.countryCode.toUpperCase(),
        institutionType: parsed.data.institutionType,
        visibility: parsed.data.institutionType === "academy" ? parsed.data.visibility : "country",
      },
    });

    revalidateUniversityCache({
      id: created.id,
      countryCode: created.countryCode,
      allCountries: created.institutionType === "academy" && created.visibility === "global",
    });
    return json({ data: created }, 201);
  } catch (e) {
    // إعادة رد JSON واضح بدل انهيار 500 غير مهيكل
    return bad("db_error", {
      code: (e as { code?: string }).code ?? "UNKNOWN",
    });
  }
}
