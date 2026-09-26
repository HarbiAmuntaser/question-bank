BEGIN;

CREATE TABLE "colleges" (
  "id" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "code" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "colleges_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "majors" ADD COLUMN "collegeId" TEXT;

CREATE UNIQUE INDEX "colleges_universityId_slug_key" ON "colleges"("universityId", "slug");
CREATE UNIQUE INDEX "colleges_universityId_code_key" ON "colleges"("universityId", "code");
CREATE INDEX "colleges_universityId_isActive_idx" ON "colleges"("universityId", "isActive");
CREATE INDEX "majors_collegeId_idx" ON "majors"("collegeId");

ALTER TABLE "colleges"
  ADD CONSTRAINT "colleges_universityId_fkey"
  FOREIGN KEY ("universityId") REFERENCES "universities"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "colleges"
  ADD CONSTRAINT "colleges_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "majors"
  ADD CONSTRAINT "majors_collegeId_fkey"
  FOREIGN KEY ("collegeId") REFERENCES "colleges"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
