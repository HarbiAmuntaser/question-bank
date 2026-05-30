// src/app/api/v1/admin/universities/countries/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  try {
    const rows = await prisma.university.findMany({
      where: {}, // يمكنك تقييدها بـ isActive: true إن رغبت
      distinct: ["countryCode"],
      select: { countryCode: true },
      orderBy: { countryCode: "asc" },
    });

    const countries = rows
      .map((r) => r.countryCode)
      .filter(Boolean) as string[];

    return json({ data: countries }, { status: 200, headers: { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE } });
  } catch {
    return bad("failed_to_list_countries");
  }
}
