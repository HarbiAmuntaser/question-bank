/* Fixed Next 15 params typing */

import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import {
  getPublicQuizPreviewBySlug,
  normalizePublicQuizSlug,
} from "@/lib/server/public-quizzes";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string[] };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug: slugArr } = await params;
  const input = normalizePublicQuizSlug(slugArr);
  if (!input.slugPath) return bad("missing_slug", undefined, 400);

  try {
    const data = await getPublicQuizPreviewBySlug(input);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_load_quiz_preview_by_slug", undefined, 500);
  }
}
