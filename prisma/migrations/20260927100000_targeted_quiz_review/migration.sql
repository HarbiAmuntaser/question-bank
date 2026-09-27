BEGIN;

ALTER TABLE "questions"
  ADD COLUMN "reviewSummaryId" TEXT,
  ADD COLUMN "reviewTopic" VARCHAR(200),
  ADD COLUMN "reviewPage" INTEGER;

ALTER TABLE "questions"
  ADD CONSTRAINT "questions_reviewPage_check"
  CHECK ("reviewPage" IS NULL OR "reviewPage" >= 1);

CREATE INDEX "questions_reviewSummaryId_idx"
  ON "questions"("reviewSummaryId");

ALTER TABLE "questions"
  ADD CONSTRAINT "questions_reviewSummaryId_fkey"
  FOREIGN KEY ("reviewSummaryId") REFERENCES "study_summaries"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
