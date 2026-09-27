BEGIN;

CREATE TYPE "ChapterKind" AS ENUM ('theory', 'practical');

ALTER TABLE "chapters"
  ADD COLUMN "kind" "ChapterKind" NOT NULL DEFAULT 'theory';

COMMIT;
