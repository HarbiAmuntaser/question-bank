/* Fixed Next 15 params typing */

import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { getPublicMajorById } from "@/lib/server/public-majors";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!id) return bad("missing_id", undefined, 400);

  try {
    const data = await getPublicMajorById(id);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_major_by_id");
  }
}
