import { Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { chapterAttachmentPurposeLabels } from "@/lib/chapter-attachments";
import type { PublicChapterAttachment } from "@/lib/server/subject-chapters";

function formatFileSize(sizeBytes: number | null) {
  if (!sizeBytes) return null;
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChapterAttachments({
  chapterId,
  attachments,
}: {
  chapterId: string;
  attachments: PublicChapterAttachment[];
}) {
  if (!attachments.length) return null;

  return (
    <section className="space-y-4" aria-labelledby="chapter-attachments-heading">
      <div>
        <h2 id="chapter-attachments-heading" className="text-xl font-bold sm:text-2xl">ملفات الفصل</h2>
        <p className="mt-1 text-sm text-muted-foreground">ملفات PDF مرفقة للمطالعة أو الطباعة.</p>
      </div>
      <div className="divide-y rounded-lg border">
        {attachments.map((attachment) => {
          const size = formatFileSize(attachment.sizeBytes);
          return (
            <div key={attachment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{attachment.title || attachment.originalName || "ملف PDF"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {chapterAttachmentPurposeLabels[attachment.purpose]}
                    {size ? ` · ${size}` : ""}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="h-10 w-full sm:w-auto">
                <a
                  href={`/api/v1/student/chapters/${chapterId}/attachments/${attachment.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="ml-2 h-4 w-4" aria-hidden />
                  فتح الملف
                </a>
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
