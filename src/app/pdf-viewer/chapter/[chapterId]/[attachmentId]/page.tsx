import { notFound } from "next/navigation";

import { ProtectedPdfViewer } from "@/components/public/pdf-viewer/pdf-viewer";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ChapterAttachmentPdfViewerPage({
  params,
}: {
  params: Promise<{ chapterId: string; attachmentId: string }>;
}) {
  const { chapterId, attachmentId } = await params;
  if (!uuidPattern.test(chapterId) || !uuidPattern.test(attachmentId)) notFound();

  return (
    <ProtectedPdfViewer
      sourceEndpoint={`/api/v1/student/pdf-viewer/chapters/${encodeURIComponent(chapterId)}/attachments/${encodeURIComponent(attachmentId)}`}
    />
  );
}
