import { prisma } from "@/lib/prisma";
import { json, bad } from "@/lib/server/admin-http";
import { verifyAdmin, adminAuthResponse } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";


export const dynamic = "force-dynamic";

const listUniversitiesForSelect = async (q: { q?: string | null }) => {
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
  };

export async function GET(req: Request) {
  const auth = await verifyAdmin(req, "universities:read");
  if (!auth.ok) return adminAuthResponse(auth);

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  try {
    const data = await listUniversitiesForSelect({ q });
    return json({ data }, { status: 200, headers: { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE } });
  } catch {
    return bad("failed_to_list_universities");
  }
}
