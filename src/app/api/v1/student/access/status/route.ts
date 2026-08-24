import { json } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { getOrCreateAnonymousSession } from "@/lib/server/anonymous-session";
import {
  checkQuizAccess,
  checkScopeAccess,
  checkStudySummaryAccess,
  getStudySummaryAccessMap,
} from "@/lib/server/access-control";
import {
  getPublicQuizIdSet,
  getPublicStudySummaryIdSet,
  isPublicMajorId,
  isPublicQuizId,
  isPublicStudySummaryId,
  isPublicSubjectId,
} from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const headers = new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });

  try {
    const url = new URL(req.url);
    const quizId = url.searchParams.get("quizId")?.trim();
    const quizIds =
      url.searchParams
        .get("quizIds")
        ?.split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 50) ?? [];
    const summaryId = url.searchParams.get("summaryId")?.trim();
    const summaryIds =
      url.searchParams
        .get("summaryIds")
        ?.split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 50) ?? [];
    const subjectId = url.searchParams.get("subjectId")?.trim();
    const majorId = url.searchParams.get("majorId")?.trim();

    if (!quizId && quizIds.length === 0 && !summaryId && summaryIds.length === 0 && !subjectId && !majorId) {
      return json({ error: "missing_access_target" }, { status: 400, headers });
    }

    if (quizIds.length > 0) {
      const publicIds = await getPublicQuizIdSet(Array.from(new Set(quizIds)));
      const { session } = await getOrCreateAnonymousSession();
      const entries = await Promise.all(
        Array.from(publicIds).map(async (id) => [id, await checkQuizAccess({ quizId: id, anonymousSessionId: session.id })] as const),
      );
      return json({ data: { items: Object.fromEntries(entries) } }, { status: 200, headers });
    }

    if (summaryIds.length > 0) {
      const publicIds = await getPublicStudySummaryIdSet(Array.from(new Set(summaryIds)));
      const { session } = await getOrCreateAnonymousSession();
      const items = await getStudySummaryAccessMap({
        summaryIds: Array.from(publicIds),
        anonymousSessionId: session.id,
      });
      return json({ data: { items } }, { status: 200, headers });
    }

    const targetIsPublic = quizId
      ? await isPublicQuizId(quizId)
      : summaryId
        ? await isPublicStudySummaryId(summaryId)
        : subjectId
          ? await isPublicSubjectId(subjectId)
          : majorId
            ? await isPublicMajorId(majorId)
            : false;

    if (!targetIsPublic) {
      return json({ error: "not_found" }, { status: 404, headers });
    }

    const { session } = await getOrCreateAnonymousSession();
    const access = quizId
      ? await checkQuizAccess({ quizId, anonymousSessionId: session.id })
      : summaryId
        ? await checkStudySummaryAccess({ summaryId, anonymousSessionId: session.id })
      : await checkScopeAccess({ subjectId, majorId, anonymousSessionId: session.id });

    return json({ data: access }, { status: 200, headers });
  } catch {
    return json({ error: "failed_to_check_access" }, { status: 500, headers });
  }
}
