BEGIN;

-- Stop rather than merge accounts or change existing email addresses.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" GROUP BY lower(btrim("email")) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'P2: conflicting normalized emails; resolve account ownership before migration';
  END IF;
END $$;

ALTER TABLE "users"
  ALTER COLUMN "role" SET DEFAULT 'student',
  ADD COLUMN "normalizedEmail" TEXT,
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

UPDATE "users" SET "normalizedEmail" = lower(btrim("email"));
ALTER TABLE "users" ALTER COLUMN "normalizedEmail" SET NOT NULL;
CREATE UNIQUE INDEX "users_normalizedEmail_key" ON "users"("normalizedEmail");
ALTER TABLE "users" ADD CONSTRAINT "users_normalized_email_check"
  CHECK ("normalizedEmail" = lower(btrim("email")));

CREATE TYPE "UserAuthTokenPurpose" AS ENUM ('verify_email', 'reset_password');
CREATE TABLE "user_auth_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" "UserAuthTokenPurpose" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "sessionVersion" INTEGER NOT NULL,
  "callbackPath" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_auth_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "user_auth_tokens_tokenHash_key" ON "user_auth_tokens"("tokenHash");
CREATE INDEX "user_auth_tokens_userId_purpose_idx" ON "user_auth_tokens"("userId", "purpose");
CREATE INDEX "user_auth_tokens_expiresAt_idx" ON "user_auth_tokens"("expiresAt");

CREATE TABLE "auth_rate_limits" (
  "key" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "auth_rate_limits_expiresAt_idx" ON "auth_rate_limits"("expiresAt");
COMMIT;
