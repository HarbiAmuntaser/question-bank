/*
  Warnings:

  - Made the column `countryCode` on table `universities` required. This step will fail if there are existing NULL values in that column.
  - Made the column `institutionType` on table `universities` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "universities" ALTER COLUMN "countryCode" SET NOT NULL,
ALTER COLUMN "countryCode" SET DEFAULT 'SA',
ALTER COLUMN "institutionType" SET NOT NULL,
ALTER COLUMN "institutionType" SET DEFAULT 'university';
