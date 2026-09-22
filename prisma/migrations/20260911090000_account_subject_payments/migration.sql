BEGIN;

-- Preserve anonymous history. No ownership is inferred and no old code is upgraded.
ALTER TABLE "access_entitlements" ADD COLUMN "userId" TEXT,
  ALTER COLUMN "anonymousSessionId" DROP NOT NULL;
ALTER TABLE "access_entitlements" ADD CONSTRAINT "access_entitlements_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
CREATE INDEX "access_entitlements_userId_subjectId_isActive_expiresAt_idx"
  ON "access_entitlements"("userId", "subjectId", "isActive", "expiresAt");
CREATE UNIQUE INDEX "access_entitlements_userId_codeId_key" ON "access_entitlements"("userId", "codeId");
ALTER TABLE "access_entitlements" DROP CONSTRAINT "access_entitlements_subjectId_fkey";
ALTER TABLE "access_entitlements" ADD CONSTRAINT "access_entitlements_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "manual_payment_requests" ADD COLUMN "userId" TEXT, ADD COLUMN "subjectId" TEXT;
ALTER TABLE "manual_payment_requests" ADD CONSTRAINT "manual_payment_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "manual_payment_requests" ADD CONSTRAINT "manual_payment_requests_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
CREATE INDEX "manual_payment_requests_userId_subjectId_status_idx" ON "manual_payment_requests"("userId", "subjectId", "status");

ALTER TABLE "subscription_codes" ADD COLUMN "paymentVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "subscription_codes" ALTER COLUMN "paymentVersion" SET DEFAULT 1;

CREATE FUNCTION payment_v1_subject_allowed(target TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM subjects s JOIN majors m ON m.id = s."majorId"
    JOIN universities u ON u.id = m."universityId"
    WHERE s.id = target AND s."isActive" AND m."isActive" AND u."isActive"
      AND u."countryCode" = 'SA' AND u."institutionType" = 'university'
  );
$$;

CREATE FUNCTION guard_payment_v1_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE valid_plan BOOLEAN; plan_subject TEXT;
BEGIN
  IF TG_TABLE_NAME = 'paid_access_plans' THEN
    IF TG_OP = 'UPDATE' AND (NEW."scopeType", NEW."subjectId", NEW."majorId") IS DISTINCT FROM
      (OLD."scopeType", OLD."subjectId", OLD."majorId") THEN
      RAISE EXCEPTION 'payment_target_immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND NOT NEW."isActive" THEN RETURN NEW; END IF;
    IF NEW."scopeType" <> 'subject' OR NEW."majorId" IS NOT NULL OR NOT payment_v1_subject_allowed(NEW."subjectId") THEN
      RAISE EXCEPTION 'payment_scope_not_allowed' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'subscription_codes' THEN
    IF TG_OP = 'UPDATE' THEN
      IF (NEW."planId", NEW."paymentVersion") IS DISTINCT FROM (OLD."planId", OLD."paymentVersion") THEN
        RAISE EXCEPTION 'payment_target_immutable' USING ERRCODE = '23514';
      END IF;
      IF NOT NEW."isActive" AND (to_jsonb(NEW) - 'isActive' - 'updatedAt') = (to_jsonb(OLD) - 'isActive' - 'updatedAt') THEN RETURN NEW; END IF;
    END IF;
    SELECT p."isActive" AND p."scopeType" = 'subject' AND p."majorId" IS NULL AND payment_v1_subject_allowed(p."subjectId")
      INTO valid_plan FROM paid_access_plans p WHERE p.id = NEW."planId";
    IF NEW."paymentVersion" <> 1 OR NOT coalesce(valid_plan, false) THEN
      RAISE EXCEPTION 'payment_scope_not_allowed' USING ERRCODE = '23514';
    END IF;
    IF NEW."maxUses" < 1 OR NEW."usedCount" < 0 OR NEW."usedCount" > NEW."maxUses" OR
      (NEW."durationDays" IS NOT NULL AND NEW."durationDays" < 1) OR
      (NEW."startsAt" IS NOT NULL AND NEW."expiresAt" IS NOT NULL AND NEW."startsAt" >= NEW."expiresAt") THEN
      RAISE EXCEPTION 'invalid_payment_code_window' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'access_entitlements' THEN
    IF TG_OP = 'UPDATE' THEN
      IF (NEW."userId", NEW."anonymousSessionId", NEW."scopeType", NEW."subjectId", NEW."majorId", NEW."codeId") IS DISTINCT FROM
        (OLD."userId", OLD."anonymousSessionId", OLD."scopeType", OLD."subjectId", OLD."majorId", OLD."codeId") THEN
        RAISE EXCEPTION 'payment_ownership_immutable' USING ERRCODE = '23514';
      END IF;
      IF NOT NEW."isActive" AND (to_jsonb(NEW) - 'isActive' - 'updatedAt') = (to_jsonb(OLD) - 'isActive' - 'updatedAt') THEN RETURN NEW; END IF;
    END IF;
    IF NEW."userId" IS NULL OR NEW."anonymousSessionId" IS NOT NULL OR NEW."scopeType" <> 'subject' OR
      NEW."majorId" IS NOT NULL OR NOT payment_v1_subject_allowed(NEW."subjectId") THEN
      RAISE EXCEPTION 'payment_owner_or_scope_invalid' USING ERRCODE = '23514';
    END IF;
    IF NEW."expiresAt" IS NOT NULL AND NEW."expiresAt" <= NEW."startsAt" THEN
      RAISE EXCEPTION 'invalid_entitlement_window' USING ERRCODE = '23514';
    END IF;
    IF NEW."codeId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM subscription_codes c JOIN paid_access_plans p ON p.id = c."planId"
      WHERE c.id = NEW."codeId" AND c."paymentVersion" = 1 AND p."scopeType" = 'subject' AND p."subjectId" = NEW."subjectId" AND p."majorId" IS NULL
    ) THEN RAISE EXCEPTION 'entitlement_code_scope_mismatch' USING ERRCODE = '23514'; END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW."userId" AND role = 'student' AND "isActive" AND "emailVerified" IS NOT NULL) THEN
      RAISE EXCEPTION 'payment_student_required' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'manual_payment_requests' THEN
    IF TG_OP = 'UPDATE' THEN
      IF (NEW."userId", NEW."anonymousSessionId", NEW."subjectId", NEW."planId") IS DISTINCT FROM
        (OLD."userId", OLD."anonymousSessionId", OLD."subjectId", OLD."planId") THEN
        RAISE EXCEPTION 'payment_ownership_immutable' USING ERRCODE = '23514';
      END IF;
      IF OLD."userId" IS NULL AND (to_jsonb(NEW) - 'status' - 'updatedAt') = (to_jsonb(OLD) - 'status' - 'updatedAt') THEN RETURN NEW; END IF;
    END IF;
    SELECT p."isActive" AND p."scopeType" = 'subject' AND p."majorId" IS NULL AND payment_v1_subject_allowed(p."subjectId"), p."subjectId"
      INTO valid_plan, plan_subject FROM paid_access_plans p WHERE p.id = NEW."planId";
    IF NEW."userId" IS NULL OR NEW."anonymousSessionId" IS NOT NULL OR NOT coalesce(valid_plan, false) OR
      NEW."subjectId" IS DISTINCT FROM plan_subject THEN
      RAISE EXCEPTION 'payment_owner_or_scope_invalid' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW."userId" AND role = 'student' AND "isActive" AND "emailVerified" IS NOT NULL) THEN
      RAISE EXCEPTION 'payment_student_required' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_plan_scope_guard BEFORE INSERT OR UPDATE ON paid_access_plans FOR EACH ROW EXECUTE FUNCTION guard_payment_v1_write();
CREATE TRIGGER payment_code_scope_guard BEFORE INSERT OR UPDATE ON subscription_codes FOR EACH ROW EXECUTE FUNCTION guard_payment_v1_write();
CREATE TRIGGER payment_entitlement_owner_guard BEFORE INSERT OR UPDATE ON access_entitlements FOR EACH ROW EXECUTE FUNCTION guard_payment_v1_write();
CREATE TRIGGER payment_request_owner_guard BEFORE INSERT OR UPDATE ON manual_payment_requests FOR EACH ROW EXECUTE FUNCTION guard_payment_v1_write();

COMMIT;
