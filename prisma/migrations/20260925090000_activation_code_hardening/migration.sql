BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM access_entitlements
    WHERE "codeId" IS NOT NULL AND "expiresAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'permanent_code_entitlement_requires_review' USING ERRCODE = '23514';
  END IF;
END;
$$;

ALTER TABLE subscription_codes
  ADD COLUMN "issuanceIdempotencyKey" TEXT,
  ADD COLUMN "issuanceRequestHash" TEXT,
  ADD CONSTRAINT subscription_codes_issuance_idempotency_pair CHECK (
    ("issuanceIdempotencyKey" IS NULL) = ("issuanceRequestHash" IS NULL)
  ),
  ADD CONSTRAINT subscription_codes_issuance_metadata_format CHECK (
    "issuanceIdempotencyKey" IS NULL OR (
      "issuanceIdempotencyKey" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      AND "issuanceRequestHash" ~ '^[0-9a-f]{64}$'
    )
  );

CREATE UNIQUE INDEX "subscription_codes_createdBy_issuanceIdempotencyKey_key"
  ON subscription_codes("createdBy", "issuanceIdempotencyKey");

ALTER TABLE access_entitlements
  ADD CONSTRAINT access_entitlements_code_expiry_required CHECK (
    "codeId" IS NULL OR "expiresAt" IS NOT NULL
  );

CREATE TABLE payment_code_redemption_events (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  "codeId" TEXT NOT NULL REFERENCES subscription_codes(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  "planId" TEXT NOT NULL REFERENCES paid_access_plans(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES subjects(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  "entitlementId" TEXT NOT NULL UNIQUE REFERENCES access_entitlements(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  "usageNumber" INTEGER NOT NULL CHECK ("usageNumber" > 0),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "codeId"),
  UNIQUE ("codeId", "usageNumber")
);
CREATE INDEX "payment_code_redemption_events_userId_createdAt_id_idx"
  ON payment_code_redemption_events("userId", "createdAt", id);
CREATE INDEX "payment_code_redemption_events_planId_idx" ON payment_code_redemption_events("planId");
CREATE INDEX "payment_code_redemption_events_subjectId_idx" ON payment_code_redemption_events("subjectId");

CREATE FUNCTION guard_payment_code_redemption_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_entitlement access_entitlements%ROWTYPE;
  target_code subscription_codes%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'payment_code_redemption_audit_immutable' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO target_entitlement FROM access_entitlements WHERE id = NEW."entitlementId";
  SELECT * INTO target_code FROM subscription_codes WHERE id = NEW."codeId";
  IF target_entitlement.id IS NULL OR target_code.id IS NULL OR
    target_entitlement."userId" IS DISTINCT FROM NEW."userId" OR
    target_entitlement."codeId" IS DISTINCT FROM NEW."codeId" OR
    target_entitlement."subjectId" IS DISTINCT FROM NEW."subjectId" OR
    target_entitlement."scopeType" <> 'subject' OR NOT target_entitlement."isActive" OR
    target_entitlement."expiresAt" IS NULL OR
    target_code."planId" IS DISTINCT FROM NEW."planId" OR
    target_code."usedCount" IS DISTINCT FROM NEW."usageNumber" OR
    NOT EXISTS (
      SELECT 1 FROM paid_access_plans p
      WHERE p.id = NEW."planId" AND p."subjectId" = NEW."subjectId"
        AND p."scopeType" = 'subject' AND p."majorId" IS NULL
    ) THEN
    RAISE EXCEPTION 'payment_code_redemption_audit_invalid' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER payment_code_redemption_event_guard
  BEFORE INSERT OR UPDATE OR DELETE ON payment_code_redemption_events
  FOR EACH ROW EXECUTE FUNCTION guard_payment_code_redemption_event();

CREATE FUNCTION guard_subscription_code_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'payment_code_history_immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD."isActive" AND NOT NEW."isActive" AND
      (to_jsonb(NEW) - 'isActive' - 'updatedAt') = (to_jsonb(OLD) - 'isActive' - 'updatedAt') THEN
      RETURN NEW;
    END IF;
    IF OLD."isActive" AND NEW."isActive" AND NEW."usedCount" = OLD."usedCount" + 1 AND
      (to_jsonb(NEW) - 'usedCount' - 'updatedAt') = (to_jsonb(OLD) - 'usedCount' - 'updatedAt') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'payment_code_state_immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER subscription_code_state_guard
  BEFORE UPDATE OR DELETE ON subscription_codes
  FOR EACH ROW EXECUTE FUNCTION guard_subscription_code_state();

CREATE FUNCTION require_payment_code_redemption_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."usedCount" IS DISTINCT FROM OLD."usedCount" AND NOT EXISTS (
    SELECT 1 FROM payment_code_redemption_events e
    WHERE e."codeId" = NEW.id AND e."usageNumber" = NEW."usedCount"
  ) THEN
    RAISE EXCEPTION 'payment_code_redemption_audit_required' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER payment_code_usage_audit
  AFTER UPDATE ON subscription_codes DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION require_payment_code_redemption_audit();

CREATE FUNCTION require_code_entitlement_redemption_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."codeId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM payment_code_redemption_events e WHERE e."entitlementId" = NEW.id
  ) THEN
    RAISE EXCEPTION 'payment_code_redemption_audit_required' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER payment_code_entitlement_audit
  AFTER INSERT ON access_entitlements DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION require_code_entitlement_redemption_audit();

COMMIT;
