import { Newspaper } from "lucide-react";

export function BlogCover({
  attachment,
  alt,
  eager = false,
  className = "aspect-[16/9]",
}: {
  attachment: { url: string | null; title: string | null } | null;
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {attachment?.url ? (
        // Attachment.url is provider-agnostic and may later point to R2 or Blob.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.url}
          alt={attachment.title || alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full min-h-44 items-center justify-center bg-muted/70 text-muted-foreground">
          <Newspaper className="h-10 w-10" aria-hidden />
          <span className="sr-only">لا توجد صورة غلاف</span>
        </div>
      )}
    </div>
  );
}
