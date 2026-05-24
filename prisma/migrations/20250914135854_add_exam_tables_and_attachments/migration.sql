/*
  Warnings:

  - You are about to drop the column `chapterId` on the `quizzes` table. All the data in the column will be lost.
  - You are about to drop the column `majorId` on the `quizzes` table. All the data in the column will be lost.
  - You are about to drop the column `universityId` on the `quizzes` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ContentLanguage" AS ENUM ('ar', 'en');

-- CreateEnum
CREATE TYPE "ExamTerm" AS ENUM ('first', 'second', 'summer');

-- CreateEnum
CREATE TYPE "ExamSession" AS ENUM ('regular', 'makeup', 'special');

-- CreateEnum
CREATE TYPE "AttachmentOwnerType" AS ENUM ('question', 'exam', 'chapter', 'subject');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('image', 'pdf', 'solution', 'other');

-- CreateEnum
CREATE TYPE "SeoOwnerType" AS ENUM ('university', 'major', 'subject', 'chapter', 'exam');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('ar', 'en');

-- DropForeignKey
ALTER TABLE "quiz_questions" DROP CONSTRAINT "quiz_questions_questionId_fkey";

-- DropForeignKey
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_majorId_fkey";

-- DropForeignKey
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_universityId_fkey";

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "language" "ContentLanguage" NOT NULL DEFAULT 'ar';

-- AlterTable
ALTER TABLE "quizzes" DROP COLUMN "chapterId",
DROP COLUMN "majorId",
DROP COLUMN "universityId";

-- CreateTable
CREATE TABLE "exam_papers" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "term" "ExamTerm" NOT NULL,
    "session" "ExamSession" NOT NULL DEFAULT 'regular',
    "code" TEXT,
    "source" TEXT,
    "fileUrl" TEXT,
    "pagesCount" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "language" "ContentLanguage" NOT NULL DEFAULT 'ar',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" TEXT NOT NULL,
    "examPaperId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "page" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "ownerType" "AttachmentOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_papers_subjectId_year_term_idx" ON "exam_papers"("subjectId", "year", "term");

-- CreateIndex
CREATE UNIQUE INDEX "exam_papers_subjectId_year_term_session_code_key" ON "exam_papers"("subjectId", "year", "term", "session", "code");

-- CreateIndex
CREATE INDEX "exam_questions_questionId_idx" ON "exam_questions"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_questions_examPaperId_questionNumber_key" ON "exam_questions"("examPaperId", "questionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "exam_questions_examPaperId_questionId_key" ON "exam_questions"("examPaperId", "questionId");

-- CreateIndex
CREATE INDEX "attachments_ownerType_ownerId_idx" ON "attachments"("ownerType", "ownerId");

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_papers" ADD CONSTRAINT "exam_papers_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_papers" ADD CONSTRAINT "exam_papers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_examPaperId_fkey" FOREIGN KEY ("examPaperId") REFERENCES "exam_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
