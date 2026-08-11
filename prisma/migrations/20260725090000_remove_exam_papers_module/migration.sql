-- Remove the legacy admin exam-papers module.
-- Quiz SEO still uses SeoOwnerType.exam, so that enum value is intentionally kept.

DELETE FROM "attachments"
WHERE "ownerType" = 'exam';

DELETE FROM "seo_meta"
WHERE "ownerType" = 'exam'
  AND "ownerId" IN (SELECT "id" FROM "exam_papers")
  AND "ownerId" NOT IN (SELECT "id" FROM "quizzes");

DROP TABLE IF EXISTS "exam_questions";
DROP TABLE IF EXISTS "exam_papers";

DROP TYPE IF EXISTS "ExamSession";
DROP TYPE IF EXISTS "ExamTerm";

ALTER TYPE "AttachmentOwnerType" RENAME TO "AttachmentOwnerType_old";
CREATE TYPE "AttachmentOwnerType" AS ENUM ('question', 'quiz', 'chapter', 'subject', 'blog_post', 'study_summary');

ALTER TABLE "attachments"
  ALTER COLUMN "ownerType" TYPE "AttachmentOwnerType"
  USING "ownerType"::text::"AttachmentOwnerType";

DROP TYPE "AttachmentOwnerType_old";
