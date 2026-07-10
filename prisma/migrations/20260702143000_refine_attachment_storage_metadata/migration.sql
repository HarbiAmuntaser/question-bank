-- Prepare attachments for external storage providers such as Cloudflare R2.
-- Existing rows remain public external URLs unless updated in a later storage phase.

CREATE TYPE "AttachmentStorageProvider" AS ENUM ('local', 'external_url', 'r2');

CREATE TYPE "AttachmentVisibility" AS ENUM ('public', 'private');

ALTER TABLE "attachments"
  ADD COLUMN "storageProvider" "AttachmentStorageProvider" NOT NULL DEFAULT 'external_url',
  ADD COLUMN "visibility" "AttachmentVisibility" NOT NULL DEFAULT 'public',
  ADD COLUMN "bucket" TEXT,
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "contentType" TEXT,
  ADD COLUMN "sizeBytes" INTEGER,
  ADD COLUMN "originalName" TEXT,
  ADD COLUMN "checksumSha256" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "url" DROP NOT NULL;

ALTER TABLE "attachments" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE INDEX "attachments_storageProvider_idx" ON "attachments"("storageProvider");
CREATE INDEX "attachments_visibility_idx" ON "attachments"("visibility");
CREATE INDEX "attachments_bucket_storageKey_idx" ON "attachments"("bucket", "storageKey");
