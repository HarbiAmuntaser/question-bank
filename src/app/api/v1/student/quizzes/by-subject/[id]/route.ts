/* Fixed Next 15 params typing */

// file: src/app/api/v1/student/quizzes/by-subject/[id]/route.ts
import { json, bad } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import {
  getPublicQuizzesBySubject,
  type PublicQuizzesBySubjectQuery,
} from "@/lib/server/public-quizzes";

export const dynamic = "force-dynamic";

type RouteParams = { id: string };
type RouteContext = {
  params: Promise<RouteParams>;
};

export async function GET(req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = rawId?.trim();

  if (!id) return bad("missing_id", undefined, 400);

  try {
    const url = new URL(req.url);
    const q: PublicQuizzesBySubjectQuery = {
      limit: url.searchParams.get("limit"),
      degreeType: url.searchParams.get("degreeType"),
    };

    const data = await getPublicQuizzesBySubject(id, q);
    if (!data) return bad("not_found", undefined, 404);

    const headers = new Headers({
      // Avoid Vercel CDN staleness; unstable_cache remains the internal cache layer.
      "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    });
    return json({ data }, { status: 200, headers });
  } catch {
    return bad("failed_to_list_quizzes_by_subject");
  }
}
