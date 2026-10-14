import { notFound } from "next/navigation";

import { ProtectedPdfViewer } from "@/components/public/pdf-viewer/pdf-viewer";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function initialPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export default async function SummaryPdfViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!uuidPattern.test(id)) notFound();

  return (
    <ProtectedPdfViewer
      sourceEndpoint={`/api/v1/student/pdf-viewer/summaries/${encodeURIComponent(id)}`}
      initialPage={initialPage(query.page)}
    />
  );
}
