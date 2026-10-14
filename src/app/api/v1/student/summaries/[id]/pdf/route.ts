import { CACHE_CONTROL } from "@/lib/cache-tags";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function privateHeaders() {
  return new Headers({
    "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE,
    "referrer-policy": "no-referrer",
    "x-robots-tag": "noindex, nofollow, noarchive",
  });
}

export async function GET(request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!uuidPattern.test(id)) {
    return json({ error: "invalid_summary_id" }, { status: 400, headers: privateHeaders() });
  }

  const rawPage = new URL(request.url).searchParams.get("page");
  if (rawPage !== null && !/^\d+$/.test(rawPage)) {
    return json({ error: "invalid_pdf_page" }, { status: 400, headers: privateHeaders() });
  }

  const target = new URL(`/pdf-viewer/summary/${encodeURIComponent(id)}`, request.url);
  if (rawPage && Number.isSafeInteger(Number(rawPage)) && Number(rawPage) >= 1) {
    target.searchParams.set("page", rawPage);
  }
  const headers = privateHeaders();
  headers.set("location", target.toString());
  return new Response(null, { status: 302, headers });
}
