/* Fixed Next 15 params typing */

import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { getPublicQuizPreviewById } from "@/lib/server/public-quizzes";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = rawId?.trim();

  if (!id) return bad("missing_id", undefined, 400);

  try {
    const data = await getPublicQuizPreviewById(id);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_quiz_preview_by_id", undefined, 500);
  }
}
