import { CACHE_CONTROL } from "@/lib/cache-tags";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ chapterId: string; attachmentId: string }> };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function privateHeaders() {
  return new Headers({
    "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    "referrer-policy": "no-referrer",
    "x-robots-tag": "noindex, nofollow, noarchive",
  });
}

export async function GET(request: Request, context: Ctx) {
  const { chapterId, attachmentId } = await context.params;
  if (!uuidPattern.test(chapterId) || !uuidPattern.test(attachmentId)) {
    return json({ error: "invalid_chapter_attachment_id" }, { status: 400, headers: privateHeaders() });
  }

  const target = new URL(
    `/pdf-viewer/chapter/${encodeURIComponent(chapterId)}/${encodeURIComponent(attachmentId)}`,
    request.url,
  );
  const headers = privateHeaders();
  headers.set("location", target.toString());
  return new Response(null, { status: 302, headers });
}
