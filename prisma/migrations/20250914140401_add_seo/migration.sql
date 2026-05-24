-- CreateTable
CREATE TABLE "seo_meta" (
    "id" TEXT NOT NULL,
    "ownerType" "SeoOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'ar',
    "slug" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImageUrl" TEXT,
    "canonicalUrl" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "nofollow" BOOLEAN NOT NULL DEFAULT false,
    "schemaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seo_meta_ownerType_ownerId_idx" ON "seo_meta"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "seo_meta_slug_locale_idx" ON "seo_meta"("slug", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "seo_meta_ownerType_ownerId_locale_key" ON "seo_meta"("ownerType", "ownerId", "locale");
