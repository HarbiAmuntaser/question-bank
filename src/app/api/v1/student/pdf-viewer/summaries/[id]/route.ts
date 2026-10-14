import { CACHE_CONTROL } from "@/lib/cache-tags";
import { json } from "@/lib/http";
import {
  getSummaryPdfViewerSource,
  PdfViewerSourceError,
} from "@/lib/server/pdf-viewer";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function privateHeaders() {
  return {
    "Cache-Control": CACHE_CONTROL.PRIVATE_NO_STORE,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

export async function GET(request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!uuidPattern.test(id)) {
    return json({ error: "invalid_summary_id" }, { status: 400, headers: privateHeaders() });
  }

  try {
    const source = await getSummaryPdfViewerSource(request, id);
    return json({ data: source }, { headers: privateHeaders() });
  } catch (error) {
    if (error instanceof PdfViewerSourceError) {
      return json({ error: error.code }, { status: error.status, headers: privateHeaders() });
    }
    return json({ error: "pdf_viewer_unavailable" }, { status: 503, headers: privateHeaders() });
  }
}
