/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('university', 'school', 'academy');

-- AlterTable
ALTER TABLE "universities" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "institutionType" "InstitutionType";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "updatedAt";

-- CreateIndex
CREATE INDEX "universities_countryCode_institutionType_isActive_idx" ON "universities"("countryCode", "institutionType", "isActive");
