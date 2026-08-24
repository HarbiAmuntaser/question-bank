ALTER TABLE "chapters"
ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "chapters_subjectId_slug_key"
ON "chapters"("subjectId", "slug");
