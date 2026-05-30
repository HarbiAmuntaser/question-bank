-- CreateEnum
CREATE TYPE "AccessScopeType" AS ENUM ('major', 'subject');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('whatsapp', 'telegram');

-- CreateEnum
CREATE TYPE "ManualPaymentStatus" AS ENUM ('pending', 'contacted', 'paid', 'rejected', 'completed');

-- CreateEnum
CREATE TYPE "QuizAccessType" AS ENUM ('inherit', 'free', 'paid');

-- AlterEnum
ALTER TYPE "AttachmentOwnerType" ADD VALUE 'quiz';

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "accessType" "QuizAccessType" NOT NULL DEFAULT 'inherit',
ADD COLUMN     "isFreePreview" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "paid_access_plans" (
    "id" TEXT NOT NULL,
    "scopeType" "AccessScopeType" NOT NULL,
    "majorId" TEXT,
    "subjectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'SAR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNumber" TEXT,
    "telegramUsername" TEXT,
    "contactMessage" TEXT,
    "defaultDurationDays" INTEGER,
    "defaultMaxUses" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paid_access_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_codes" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codePreview" TEXT,
    "planId" TEXT NOT NULL,
    "durationDays" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_entitlements" (
    "id" TEXT NOT NULL,
    "anonymousSessionId" TEXT NOT NULL,
    "codeId" TEXT,
    "scopeType" "AccessScopeType" NOT NULL,
    "majorId" TEXT,
    "subjectId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_payment_requests" (
    "id" TEXT NOT NULL,
    "anonymousSessionId" TEXT,
    "planId" TEXT,
    "contactMethod" "ContactMethod",
    "contactValue" TEXT,
    "message" TEXT,
    "pageUrl" TEXT,
    "status" "ManualPaymentStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paid_access_plans_scopeType_idx" ON "paid_access_plans"("scopeType");

-- CreateIndex
CREATE INDEX "paid_access_plans_majorId_idx" ON "paid_access_plans"("majorId");

-- CreateIndex
CREATE INDEX "paid_access_plans_subjectId_idx" ON "paid_access_plans"("subjectId");

-- CreateIndex
CREATE INDEX "paid_access_plans_isActive_idx" ON "paid_access_plans"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_codes_codeHash_key" ON "subscription_codes"("codeHash");

-- CreateIndex
CREATE INDEX "subscription_codes_planId_idx" ON "subscription_codes"("planId");

-- CreateIndex
CREATE INDEX "subscription_codes_isActive_idx" ON "subscription_codes"("isActive");

-- CreateIndex
CREATE INDEX "subscription_codes_expiresAt_idx" ON "subscription_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "subscription_codes_createdBy_idx" ON "subscription_codes"("createdBy");

-- CreateIndex
CREATE INDEX "access_entitlements_anonymousSessionId_idx" ON "access_entitlements"("anonymousSessionId");

-- CreateIndex
CREATE INDEX "access_entitlements_scopeType_idx" ON "access_entitlements"("scopeType");

-- CreateIndex
CREATE INDEX "access_entitlements_majorId_idx" ON "access_entitlements"("majorId");

-- CreateIndex
CREATE INDEX "access_entitlements_subjectId_idx" ON "access_entitlements"("subjectId");

-- CreateIndex
CREATE INDEX "access_entitlements_expiresAt_idx" ON "access_entitlements"("expiresAt");

-- CreateIndex
CREATE INDEX "access_entitlements_isActive_idx" ON "access_entitlements"("isActive");

-- CreateIndex
CREATE INDEX "manual_payment_requests_anonymousSessionId_idx" ON "manual_payment_requests"("anonymousSessionId");

-- CreateIndex
CREATE INDEX "manual_payment_requests_planId_idx" ON "manual_payment_requests"("planId");

-- CreateIndex
CREATE INDEX "manual_payment_requests_status_idx" ON "manual_payment_requests"("status");

-- CreateIndex
CREATE INDEX "manual_payment_requests_createdAt_idx" ON "manual_payment_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "paid_access_plans" ADD CONSTRAINT "paid_access_plans_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "majors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_access_plans" ADD CONSTRAINT "paid_access_plans_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_codes" ADD CONSTRAINT "subscription_codes_planId_fkey" FOREIGN KEY ("planId") REFERENCES "paid_access_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_codes" ADD CONSTRAINT "subscription_codes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_entitlements" ADD CONSTRAINT "access_entitlements_anonymousSessionId_fkey" FOREIGN KEY ("anonymousSessionId") REFERENCES "anonymous_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_entitlements" ADD CONSTRAINT "access_entitlements_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "subscription_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_entitlements" ADD CONSTRAINT "access_entitlements_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "majors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_entitlements" ADD CONSTRAINT "access_entitlements_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_requests" ADD CONSTRAINT "manual_payment_requests_anonymousSessionId_fkey" FOREIGN KEY ("anonymousSessionId") REFERENCES "anonymous_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_requests" ADD CONSTRAINT "manual_payment_requests_planId_fkey" FOREIGN KEY ("planId") REFERENCES "paid_access_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
