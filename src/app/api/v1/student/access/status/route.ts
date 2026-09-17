import { json } from "@/lib/http";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import {
  checkQuizAccess,
  checkScopeAccess,
  checkStudySummaryAccess,
  getStudySummaryAccessMap,
  getQuizAccessMap,
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
      const items = await getQuizAccessMap(Array.from(publicIds));
      return json({ data: { items } }, { status: 200, headers });
    }

    if (summaryIds.length > 0) {
      const publicIds = await getPublicStudySummaryIdSet(Array.from(new Set(summaryIds)));
      const items = await getStudySummaryAccessMap({
        summaryIds: Array.from(publicIds),
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

    const access = quizId
      ? await checkQuizAccess({ quizId })
      : summaryId
        ? await checkStudySummaryAccess({ summaryId })
      : await checkScopeAccess({ subjectId, majorId });

    if (access.reason === "not_found") return json({ error: "not_found" }, { status: 404, headers });

    return json({ data: access }, { status: 200, headers });
  } catch {
    return json({ error: "failed_to_check_access" }, { status: 500, headers });
  }
}
