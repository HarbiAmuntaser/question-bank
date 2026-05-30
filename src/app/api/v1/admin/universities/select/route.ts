import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const listUniversitiesForSelect = unstable_cache(
  async (q: { q?: string | null }) => {
    const query = (q.q ?? "").trim();
    const where = query
      ? {
          AND: [
            { isActive: true },
            {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { code: { contains: query, mode: "insensitive" as const } },
                { city: { contains: query, mode: "insensitive" as const } },
                { region: { contains: query, mode: "insensitive" as const } },
              ],
            },
          ],
        }
      : { isActive: true };

    const rows = await prisma.university.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
      take: 500,
    });

    return rows;
  },
  ["admin-universities-select"],
  { revalidate: 3600, tags: ["universities"] }
);

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  try {
    const data = await listUniversitiesForSelect({ q });
    return json({ data }, { status: 200, headers: { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE } });
  } catch {
    return bad("failed_to_list_universities");
  }
}
