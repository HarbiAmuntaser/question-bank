-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "majorId" TEXT,
ADD COLUMN     "universityId" TEXT;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "majors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
