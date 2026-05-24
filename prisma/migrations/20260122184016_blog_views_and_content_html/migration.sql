-- CreateEnum
CREATE TYPE "BlogViewTrigger" AS ENUM ('dwell', 'scroll');

-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN     "contentHtml" TEXT;

-- CreateTable
CREATE TABLE "blog_post_view_events" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "trigger" "BlogViewTrigger" NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "dwellSeconds" INTEGER,
    "scrollPercent" INTEGER,
    "referrer" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_post_view_events_postId_createdAt_idx" ON "blog_post_view_events"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "blog_post_view_events_sessionId_createdAt_idx" ON "blog_post_view_events"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "blog_post_view_events_userId_createdAt_idx" ON "blog_post_view_events"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "blog_post_view_events" ADD CONSTRAINT "blog_post_view_events_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_view_events" ADD CONSTRAINT "blog_post_view_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_view_events" ADD CONSTRAINT "blog_post_view_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "anonymous_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
