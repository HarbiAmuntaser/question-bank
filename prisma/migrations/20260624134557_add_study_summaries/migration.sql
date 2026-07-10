-- CreateEnum
CREATE TYPE "StudySummaryStatus" AS ENUM ('draft', 'published', 'archived');

-- AlterEnum
ALTER TYPE "AttachmentOwnerType" ADD VALUE 'study_summary';

-- AlterEnum
ALTER TYPE "SeoOwnerType" ADD VALUE 'study_summary';

-- CreateTable
CREATE TABLE "study_summaries" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" JSONB,
    "contentText" TEXT,
    "contentHtml" TEXT,
    "pdfAttachmentId" TEXT,
    "status" "StudySummaryStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "language" "ContentLanguage" NOT NULL DEFAULT 'ar',
    "readingMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_summaries_subjectId_status_publishedAt_idx" ON "study_summaries"("subjectId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "study_summaries_chapterId_idx" ON "study_summaries"("chapterId");

-- CreateIndex
CREATE INDEX "study_summaries_pdfAttachmentId_idx" ON "study_summaries"("pdfAttachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "study_summaries_subjectId_slug_language_key" ON "study_summaries"("subjectId", "slug", "language");

-- AddForeignKey
ALTER TABLE "study_summaries" ADD CONSTRAINT "study_summaries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_summaries" ADD CONSTRAINT "study_summaries_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_summaries" ADD CONSTRAINT "study_summaries_pdfAttachmentId_fkey" FOREIGN KEY ("pdfAttachmentId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
