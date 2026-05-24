// src/app/api/v1/admin/universities/countries/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
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

    return json({ data: countries }, { status: 200, headers: { "cache-control": "public, s-maxage=3600" } });
  } catch {
    return bad("failed_to_list_countries");
  }
}
