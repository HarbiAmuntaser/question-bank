ALTER TABLE payment_admin_events
  DROP CONSTRAINT payment_admin_event_target;

CREATE TYPE "PaymentAdminAction_new" AS ENUM (
  'plan_created',
  'plan_updated',
  'plan_disabled',
  'code_issued',
  'code_disabled',
  'code_enabled',
  'entitlement_revoked'
);

ALTER TABLE payment_admin_events
  ALTER COLUMN action TYPE "PaymentAdminAction_new"
  USING action::text::"PaymentAdminAction_new";

DROP TYPE "PaymentAdminAction";
ALTER TYPE "PaymentAdminAction_new" RENAME TO "PaymentAdminAction";

ALTER TABLE payment_admin_events
  ADD CONSTRAINT payment_admin_event_target CHECK (
    (action IN ('plan_created', 'plan_updated', 'plan_disabled') AND "planId" IS NOT NULL AND "codeId" IS NULL AND "entitlementId" IS NULL) OR
    (action IN ('code_issued', 'code_disabled', 'code_enabled') AND "codeId" IS NOT NULL AND "planId" IS NULL AND "entitlementId" IS NULL) OR
    (action = 'entitlement_revoked' AND "entitlementId" IS NOT NULL AND "planId" IS NULL AND "codeId" IS NULL)
  );

CREATE OR REPLACE FUNCTION guard_payment_admin_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor users%ROWTYPE; target_active BOOLEAN; target_grant code_access_grants%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'payment_admin_audit_immutable' USING ERRCODE = '23514'; END IF;
  SELECT * INTO actor FROM users WHERE id = NEW."actorId" FOR SHARE;
  IF actor.id IS NULL OR NOT actor."isActive" OR actor.role <> 'admin' OR actor."sessionVersion" <> NEW."actorSessionVersion" THEN
    RAISE EXCEPTION 'payment_admin_actor_invalid' USING ERRCODE = '23514';
  END IF;
  IF NEW.action = 'entitlement_revoked' THEN
    SELECT "isActive" INTO target_active FROM access_entitlements WHERE id = NEW."entitlementId";
    IF target_active IS DISTINCT FROM false OR NEW."before"->'isActive' IS DISTINCT FROM 'true'::jsonb OR NEW."after"->'isActive' IS DISTINCT FROM 'false'::jsonb THEN
      RAISE EXCEPTION 'payment_admin_transition_invalid' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.action = 'code_disabled' THEN
    SELECT "isActive" INTO target_active FROM subscription_codes WHERE id = NEW."codeId";
    IF target_active IS DISTINCT FROM false OR NEW."before"->'isActive' IS DISTINCT FROM 'true'::jsonb OR NEW."after"->'isActive' IS DISTINCT FROM 'false'::jsonb THEN
      RAISE EXCEPTION 'payment_admin_transition_invalid' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.action = 'code_enabled' THEN
    SELECT "isActive" INTO target_active FROM subscription_codes WHERE id = NEW."codeId";
    SELECT * INTO target_grant FROM code_access_grants WHERE "codeId" = NEW."codeId";
    IF target_active IS DISTINCT FROM true OR NEW."before"->'isActive' IS DISTINCT FROM 'false'::jsonb OR NEW."after"->'isActive' IS DISTINCT FROM 'true'::jsonb OR
      (target_grant.id IS NOT NULL AND (NOT target_grant."isActive" OR target_grant."revokedAt" IS NOT NULL OR target_grant."expiresAt" <= clock_timestamp())) THEN
      RAISE EXCEPTION 'payment_admin_transition_invalid' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION require_payment_revocation_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."isActive" AND NOT NEW."isActive" AND NOT EXISTS (
    SELECT 1 FROM payment_admin_events a
    WHERE ((TG_TABLE_NAME = 'access_entitlements' AND a.action = 'entitlement_revoked' AND a."entitlementId" = NEW.id) OR
      (TG_TABLE_NAME = 'subscription_codes' AND a.action = 'code_disabled' AND a."codeId" = NEW.id))
      AND (a."after"->>'updatedAt')::timestamp = NEW."updatedAt"
  ) THEN RAISE EXCEPTION 'payment_revocation_audit_required' USING ERRCODE = '23514'; END IF;
  IF NOT OLD."isActive" AND NEW."isActive" THEN
    IF TG_TABLE_NAME <> 'subscription_codes' OR NOT EXISTS (
      SELECT 1 FROM payment_admin_events a
      WHERE a.action = 'code_enabled' AND a."codeId" = NEW.id
        AND (a."after"->>'updatedAt')::timestamp = NEW."updatedAt"
    ) THEN
      RAISE EXCEPTION 'payment_reactivation_not_supported' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION guard_subscription_code_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'payment_code_history_immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD."isActive" IS DISTINCT FROM NEW."isActive" AND
      (to_jsonb(NEW) - 'isActive' - 'updatedAt') = (to_jsonb(OLD) - 'isActive' - 'updatedAt') THEN
      RETURN NEW;
    END IF;
    IF OLD."isActive" AND NEW."isActive" AND NEW."usedCount" = OLD."usedCount" + 1 AND
      (to_jsonb(NEW) - 'usedCount' - 'updatedAt') = (to_jsonb(OLD) - 'usedCount' - 'updatedAt') THEN
      RETURN NEW;
    END IF;
    IF NEW."maxBrowserSessions" IS DISTINCT FROM OLD."maxBrowserSessions" AND
      (to_jsonb(NEW) - 'maxBrowserSessions' - 'updatedAt') = (to_jsonb(OLD) - 'maxBrowserSessions' - 'updatedAt') THEN
      IF EXISTS (
        SELECT 1 FROM code_access_grants g
        WHERE g."codeId" = NEW.id AND (
          SELECT count(*) FROM code_access_session_bindings b
          WHERE b."grantId" = g.id AND b."revokedAt" IS NULL
        ) > NEW."maxBrowserSessions"
      ) THEN
        RAISE EXCEPTION 'code_access_browser_limit_exceeded' USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'payment_code_state_immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
