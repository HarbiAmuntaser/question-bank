-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('draft', 'published', 'archived');

-- AlterEnum
ALTER TYPE "AttachmentOwnerType" ADD VALUE 'blog_post';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SeoOwnerType" ADD VALUE 'blog_post';
ALTER TYPE "SeoOwnerType" ADD VALUE 'blog_topic';
ALTER TYPE "SeoOwnerType" ADD VALUE 'blog_tag';

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" JSONB NOT NULL,
    "contentText" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "coverImageUrl" TEXT,
    "countryCode" TEXT,
    "language" "ContentLanguage" NOT NULL DEFAULT 'ar',
    "primaryTopicId" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_secondary_topics" (
    "postId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_secondary_topics_pkey" PRIMARY KEY ("postId","topicId")
);

-- CreateTable
CREATE TABLE "blog_post_tags" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_tags_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "blog_post_attachments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_posts_status_publishedAt_idx" ON "blog_posts"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "blog_posts_primaryTopicId_idx" ON "blog_posts"("primaryTopicId");

-- CreateIndex
CREATE INDEX "blog_posts_countryCode_idx" ON "blog_posts"("countryCode");

-- CreateIndex
CREATE INDEX "blog_topics_isActive_idx" ON "blog_topics"("isActive");

-- CreateIndex
CREATE INDEX "blog_topics_countryCode_idx" ON "blog_topics"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "blog_topics_name_key" ON "blog_topics"("name");

-- CreateIndex
CREATE INDEX "blog_tags_isActive_idx" ON "blog_tags"("isActive");

-- CreateIndex
CREATE INDEX "blog_tags_countryCode_idx" ON "blog_tags"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tags_name_key" ON "blog_tags"("name");

-- CreateIndex
CREATE INDEX "blog_post_secondary_topics_topicId_idx" ON "blog_post_secondary_topics"("topicId");

-- CreateIndex
CREATE INDEX "blog_post_tags_tagId_idx" ON "blog_post_tags"("tagId");

-- CreateIndex
CREATE INDEX "blog_post_attachments_postId_sortOrder_idx" ON "blog_post_attachments"("postId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_attachments_postId_attachmentId_key" ON "blog_post_attachments"("postId", "attachmentId");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_primaryTopicId_fkey" FOREIGN KEY ("primaryTopicId") REFERENCES "blog_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_secondary_topics" ADD CONSTRAINT "blog_post_secondary_topics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_secondary_topics" ADD CONSTRAINT "blog_post_secondary_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "blog_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_attachments" ADD CONSTRAINT "blog_post_attachments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_attachments" ADD CONSTRAINT "blog_post_attachments_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
