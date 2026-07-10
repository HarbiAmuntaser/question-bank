export type StudySummaryStatus = "draft" | "published" | "archived";
export type StudySummaryLanguage = "ar" | "en";
export type StudySummaryAccessType = "inherit" | "free" | "paid";

export type SummarySubject = {
  id: string;
  name: string;
  code: string | null;
  major: {
    id: string;
    name: string;
    code: string | null;
    university: { id: string; name: string; code: string | null };
  };
};

export type SummaryChapter = {
  id: string;
  name: string;
  chapterNumber: number | null;
  subjectId: string;
};

export type SummaryAttachment = {
  id: string;
  url: string | null;
  title: string | null;
  kind: string;
  ownerType: string;
  ownerId: string;
  storageProvider: string;
  visibility: string;
  contentType: string | null;
  sizeBytes: number | null;
  originalName: string | null;
  createdAt: string;
};

export type StudySummaryRow = {
  id: string;
  subjectId: string;
  chapterId: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: unknown;
  contentHtml: string | null;
  contentText: string | null;
  pdfAttachmentId: string | null;
  status: StudySummaryStatus;
  accessType: StudySummaryAccessType;
  publishedAt: string | null;
  language: StudySummaryLanguage;
  readingMinutes: number | null;
  sortOrder: number;
  isFeatured: boolean;
  subject: SummarySubject;
  chapter: SummaryChapter | null;
  pdfAttachment: SummaryAttachment | null;
  createdAt: string;
  updatedAt: string;
};

export type SummaryPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type StudySummaryListResponse = {
  data: StudySummaryRow[];
  pagination: SummaryPagination;
};
