/*
  Warnings:

  - You are about to drop the column `countryCode` on the `blog_posts` table. All the data in the column will be lost.
  - You are about to drop the column `coverImageUrl` on the `blog_posts` table. All the data in the column will be lost.
  - You are about to drop the column `countryCode` on the `blog_tags` table. All the data in the column will be lost.
  - You are about to drop the column `countryCode` on the `blog_topics` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[language,slug]` on the table `blog_posts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `blog_tags` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `blog_topics` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `blog_posts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `blog_tags` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `blog_topics` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BlogVisibility" AS ENUM ('global', 'countries');

-- CreateEnum
CREATE TYPE "BlogRelatedOwnerType" AS ENUM ('university', 'major', 'subject', 'chapter', 'quiz');

-- DropIndex
DROP INDEX "blog_posts_countryCode_idx";

-- DropIndex
DROP INDEX "blog_tags_countryCode_idx";

-- DropIndex
DROP INDEX "blog_topics_countryCode_idx";

-- AlterTable
ALTER TABLE "blog_posts" DROP COLUMN "countryCode",
DROP COLUMN "coverImageUrl",
ADD COLUMN     "coverAttachmentId" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readingMinutes" INTEGER,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visibility" "BlogVisibility" NOT NULL DEFAULT 'global';

-- AlterTable
ALTER TABLE "blog_tags" DROP COLUMN "countryCode",
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "blog_topics" DROP COLUMN "countryCode",
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "blog_post_countries" (
    "postId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_countries_pkey" PRIMARY KEY ("postId","countryCode")
);

-- CreateTable
CREATE TABLE "blog_post_related_entities" (
    "postId" TEXT NOT NULL,
    "ownerType" "BlogRelatedOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_related_entities_pkey" PRIMARY KEY ("postId","ownerType","ownerId")
);

-- CreateIndex
CREATE INDEX "blog_post_countries_countryCode_idx" ON "blog_post_countries"("countryCode");

-- CreateIndex
CREATE INDEX "blog_post_related_entities_ownerType_ownerId_idx" ON "blog_post_related_entities"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "blog_post_related_entities_postId_sortOrder_idx" ON "blog_post_related_entities"("postId", "sortOrder");

-- CreateIndex
CREATE INDEX "blog_posts_visibility_status_idx" ON "blog_posts"("visibility", "status");

-- CreateIndex
CREATE INDEX "blog_posts_coverAttachmentId_idx" ON "blog_posts"("coverAttachmentId");

-- CreateIndex
CREATE INDEX "blog_posts_featured_sortOrder_idx" ON "blog_posts"("featured", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_language_slug_key" ON "blog_posts"("language", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tags_slug_key" ON "blog_tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_topics_slug_key" ON "blog_topics"("slug");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_coverAttachmentId_fkey" FOREIGN KEY ("coverAttachmentId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_countries" ADD CONSTRAINT "blog_post_countries_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_related_entities" ADD CONSTRAINT "blog_post_related_entities_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
