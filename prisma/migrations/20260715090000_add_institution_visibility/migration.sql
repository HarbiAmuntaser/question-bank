-- Add visibility policy for institutions. Existing rows remain country-scoped.
CREATE TYPE "InstitutionVisibility" AS ENUM ('country', 'global');

ALTER TABLE "universities"
ADD COLUMN "visibility" "InstitutionVisibility" NOT NULL DEFAULT 'country';

CREATE INDEX "universities_institutionType_visibility_isActive_idx"
ON "universities"("institutionType", "visibility", "isActive");

CREATE INDEX "universities_visibility_idx"
ON "universities"("visibility");
