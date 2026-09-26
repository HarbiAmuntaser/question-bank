/* Fixed Next 15 params typing */

// src/app/api/v1/student/universities/[id]/route.ts
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL, CACHE_TTL } from "@/lib/cache-tags";
import { getPublicUniversityById } from "@/lib/server/public-universities";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) return bad("missing_id", undefined, 400);

  try {
    const data = await getPublicUniversityById(id);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.publicSMaxage(CACHE_TTL.publicLong),
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_university");
  }
}
