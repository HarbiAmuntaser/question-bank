BEGIN;

CREATE TYPE "PaymentAdminAction" AS ENUM ('plan_created', 'plan_updated', 'plan_disabled', 'code_issued', 'code_disabled', 'entitlement_revoked');
CREATE TABLE payment_admin_events (
  id TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  "actorSessionVersion" INTEGER NOT NULL,
  action "PaymentAdminAction" NOT NULL,
  "planId" TEXT REFERENCES paid_access_plans(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  "codeId" TEXT REFERENCES subscription_codes(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  "entitlementId" TEXT REFERENCES access_entitlements(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  reason TEXT NOT NULL CHECK (length(btrim(reason)) BETWEEN 5 AND 1000),
  "before" JSONB NOT NULL CHECK (jsonb_typeof("before") = 'object'),
  "after" JSONB NOT NULL CHECK (jsonb_typeof("after") = 'object'),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payment_admin_event_target CHECK (
    (action IN ('plan_created', 'plan_updated', 'plan_disabled') AND "planId" IS NOT NULL AND "codeId" IS NULL AND "entitlementId" IS NULL) OR
    (action IN ('code_issued', 'code_disabled') AND "codeId" IS NOT NULL AND "planId" IS NULL AND "entitlementId" IS NULL) OR
    (action = 'entitlement_revoked' AND "entitlementId" IS NOT NULL AND "planId" IS NULL AND "codeId" IS NULL)
  )
);
CREATE UNIQUE INDEX "payment_admin_events_entitlementId_key" ON payment_admin_events("entitlementId");
CREATE INDEX "payment_admin_events_createdAt_id_idx" ON payment_admin_events("createdAt", id);
CREATE INDEX "payment_admin_events_actorId_idx" ON payment_admin_events("actorId");
CREATE INDEX "payment_admin_events_planId_idx" ON payment_admin_events("planId");
CREATE INDEX "payment_admin_events_codeId_idx" ON payment_admin_events("codeId");

CREATE FUNCTION guard_payment_admin_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor users%ROWTYPE; target_active BOOLEAN;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'payment_admin_audit_immutable' USING ERRCODE = '23514'; END IF;
  SELECT * INTO actor FROM users WHERE id = NEW."actorId" FOR SHARE;
  IF actor.id IS NULL OR NOT actor."isActive" OR actor.role <> 'admin' OR actor."sessionVersion" <> NEW."actorSessionVersion" THEN
    RAISE EXCEPTION 'payment_admin_actor_invalid' USING ERRCODE = '23514';
  END IF;
  IF NEW.action IN ('entitlement_revoked', 'code_disabled') THEN
    IF NEW.action = 'entitlement_revoked' THEN SELECT "isActive" INTO target_active FROM access_entitlements WHERE id = NEW."entitlementId";
    ELSE SELECT "isActive" INTO target_active FROM subscription_codes WHERE id = NEW."codeId"; END IF;
    IF target_active IS DISTINCT FROM false OR NEW."before"->'isActive' IS DISTINCT FROM 'true'::jsonb OR NEW."after"->'isActive' IS DISTINCT FROM 'false'::jsonb THEN
      RAISE EXCEPTION 'payment_admin_transition_invalid' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER payment_admin_event_guard BEFORE INSERT OR UPDATE OR DELETE ON payment_admin_events FOR EACH ROW EXECUTE FUNCTION guard_payment_admin_event();

-- Revocation and its audit must commit together. No historical audit is fabricated.
CREATE FUNCTION require_payment_revocation_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."isActive" AND NOT NEW."isActive" AND NOT EXISTS (
    SELECT 1 FROM payment_admin_events a
    WHERE ((TG_TABLE_NAME = 'access_entitlements' AND a.action = 'entitlement_revoked' AND a."entitlementId" = NEW.id) OR
      (TG_TABLE_NAME = 'subscription_codes' AND a.action = 'code_disabled' AND a."codeId" = NEW.id))
      AND (a."after"->>'updatedAt')::timestamp = NEW."updatedAt"
  ) THEN RAISE EXCEPTION 'payment_revocation_audit_required' USING ERRCODE = '23514'; END IF;
  IF NOT OLD."isActive" AND NEW."isActive" THEN
    RAISE EXCEPTION 'payment_reactivation_not_supported' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER payment_entitlement_revocation_audit AFTER UPDATE ON access_entitlements DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_payment_revocation_audit();
CREATE CONSTRAINT TRIGGER payment_code_revocation_audit AFTER UPDATE ON subscription_codes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_payment_revocation_audit();

COMMIT;
