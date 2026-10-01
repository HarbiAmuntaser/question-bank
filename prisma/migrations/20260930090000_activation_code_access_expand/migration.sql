CREATE TYPE "CodeAccessPrincipalType" AS ENUM ('account', 'guest');
CREATE TYPE "CodeAccessEventType" AS ENUM ('activated', 'session_recovered', 'session_transferred', 'session_revoked', 'browser_limit_changed', 'grant_revoked');
CREATE TYPE "CodeAccessActorType" AS ENUM ('account', 'guest', 'admin', 'system');

ALTER TABLE paid_access_plans
  ADD COLUMN "activationCodesEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE subscription_codes
  ADD COLUMN "supportReference" VARCHAR(32),
  ADD COLUMN "maxBrowserSessions" INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT subscription_codes_support_reference_format CHECK (
    "supportReference" IS NULL OR "supportReference" ~ '^AC-[A-Z2-9]{12}$'
  ),
  ADD CONSTRAINT subscription_codes_browser_limit CHECK (
    "maxBrowserSessions" BETWEEN 1 AND 100
  );

CREATE UNIQUE INDEX "subscription_codes_supportReference_key"
  ON subscription_codes("supportReference");

CREATE TABLE code_access_grants (
  id TEXT PRIMARY KEY,
  "codeId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "principalType" "CodeAccessPrincipalType" NOT NULL,
  "userId" TEXT,
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT code_access_grants_principal_check CHECK (
    ("principalType" = 'account' AND "userId" IS NOT NULL) OR
    ("principalType" = 'guest' AND "userId" IS NULL)
  ),
  CONSTRAINT code_access_grants_window_check CHECK ("startsAt" < "expiresAt"),
  CONSTRAINT code_access_grants_revocation_check CHECK (
    ("isActive" AND "revokedAt" IS NULL) OR
    (NOT "isActive" AND "revokedAt" IS NOT NULL)
  ),
  CONSTRAINT "code_access_grants_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES subscription_codes(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "code_access_grants_planId_fkey" FOREIGN KEY ("planId") REFERENCES paid_access_plans(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "code_access_grants_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES subjects(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "code_access_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "code_access_grants_codeId_key" ON code_access_grants("codeId");
CREATE INDEX "code_access_grants_userId_subjectId_isActive_expiresAt_idx" ON code_access_grants("userId", "subjectId", "isActive", "expiresAt");
CREATE INDEX "code_access_grants_subjectId_isActive_expiresAt_idx" ON code_access_grants("subjectId", "isActive", "expiresAt");
CREATE INDEX "code_access_grants_planId_idx" ON code_access_grants("planId");

CREATE TABLE guest_access_sessions (
  id TEXT PRIMARY KEY,
  "tokenHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT guest_access_sessions_token_hash_format CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT guest_access_sessions_window_check CHECK ("createdAt" < "expiresAt"),
  CONSTRAINT guest_access_sessions_activity_check CHECK ("lastSeenAt" >= "createdAt")
);

CREATE UNIQUE INDEX "guest_access_sessions_tokenHash_key" ON guest_access_sessions("tokenHash");
CREATE INDEX "guest_access_sessions_expiresAt_idx" ON guest_access_sessions("expiresAt");
CREATE INDEX "guest_access_sessions_revokedAt_idx" ON guest_access_sessions("revokedAt");

CREATE TABLE code_access_session_bindings (
  id TEXT PRIMARY KEY,
  "grantId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "boundAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT code_access_session_bindings_time_check CHECK ("lastUsedAt" >= "boundAt"),
  CONSTRAINT "code_access_session_bindings_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES code_access_grants(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "code_access_session_bindings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES guest_access_sessions(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "code_access_session_bindings_grantId_sessionId_key" ON code_access_session_bindings("grantId", "sessionId");
CREATE INDEX "code_access_session_bindings_grantId_revokedAt_lastUsedAt_idx" ON code_access_session_bindings("grantId", "revokedAt", "lastUsedAt");
CREATE INDEX "code_access_session_bindings_sessionId_revokedAt_idx" ON code_access_session_bindings("sessionId", "revokedAt");

CREATE TABLE code_access_events (
  id TEXT PRIMARY KEY,
  "grantId" TEXT NOT NULL,
  "codeId" TEXT NOT NULL,
  type "CodeAccessEventType" NOT NULL,
  "actorType" "CodeAccessActorType" NOT NULL,
  "actorUserId" TEXT,
  "actorSessionVersion" INTEGER,
  "sessionId" TEXT,
  "replacedSessionId" TEXT,
  "idempotencyKey" VARCHAR(100) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT code_access_events_idempotency_format CHECK (
    "idempotencyKey" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT code_access_events_request_hash_format CHECK ("requestHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT code_access_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT "code_access_events_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES code_access_grants(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "code_access_events_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES subscription_codes(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "code_access_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "code_access_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES guest_access_sessions(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "code_access_events_replacedSessionId_fkey" FOREIGN KEY ("replacedSessionId") REFERENCES guest_access_sessions(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "code_access_events_grantId_idempotencyKey_key" ON code_access_events("grantId", "idempotencyKey");
CREATE UNIQUE INDEX code_access_events_one_activation_per_grant ON code_access_events("grantId") WHERE type = 'activated';
CREATE INDEX "code_access_events_codeId_createdAt_id_idx" ON code_access_events("codeId", "createdAt", id);
CREATE INDEX "code_access_events_grantId_type_createdAt_idx" ON code_access_events("grantId", type, "createdAt");
CREATE INDEX "code_access_events_actorUserId_idx" ON code_access_events("actorUserId");

CREATE FUNCTION guard_code_access_grant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_code subscription_codes%ROWTYPE; target_plan paid_access_plans%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'code_access_grant_immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO target_code FROM subscription_codes WHERE id = NEW."codeId" FOR SHARE;
    SELECT * INTO target_plan FROM paid_access_plans WHERE id = NEW."planId" FOR SHARE;
    IF target_code.id IS NULL OR target_plan.id IS NULL OR
      target_code."planId" IS DISTINCT FROM NEW."planId" OR
      target_plan."subjectId" IS DISTINCT FROM NEW."subjectId" OR
      target_plan."scopeType" <> 'subject' OR target_plan."majorId" IS NOT NULL OR
      target_code."usedCount" <> 0 OR EXISTS (
        SELECT 1 FROM access_entitlements e WHERE e."codeId" = NEW."codeId"
      ) THEN
      RAISE EXCEPTION 'code_access_grant_target_invalid' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD."isActive" AND NOT NEW."isActive" AND OLD."revokedAt" IS NULL AND NEW."revokedAt" IS NOT NULL AND
    (to_jsonb(NEW) - 'isActive' - 'revokedAt' - 'updatedAt') =
    (to_jsonb(OLD) - 'isActive' - 'revokedAt' - 'updatedAt') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'code_access_grant_immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER code_access_grant_guard
  BEFORE INSERT OR UPDATE OR DELETE ON code_access_grants
  FOR EACH ROW EXECUTE FUNCTION guard_code_access_grant();

CREATE FUNCTION guard_guest_access_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'guest_access_session_immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND NOT (
    (NEW."revokedAt" IS NOT DISTINCT FROM OLD."revokedAt" OR (OLD."revokedAt" IS NULL AND NEW."revokedAt" IS NOT NULL)) AND
    NEW."expiresAt" >= OLD."expiresAt" AND
    (to_jsonb(NEW) - 'lastSeenAt' - 'expiresAt' - 'revokedAt' - 'updatedAt') =
    (to_jsonb(OLD) - 'lastSeenAt' - 'expiresAt' - 'revokedAt' - 'updatedAt')
  ) THEN
    RAISE EXCEPTION 'guest_access_session_immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guest_access_session_guard
  BEFORE UPDATE OR DELETE ON guest_access_sessions
  FOR EACH ROW EXECUTE FUNCTION guard_guest_access_session();

CREATE FUNCTION guard_code_access_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_grant code_access_grants%ROWTYPE; target_session guest_access_sessions%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'code_access_binding_immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO target_grant FROM code_access_grants WHERE id = NEW."grantId" FOR SHARE;
    SELECT * INTO target_session FROM guest_access_sessions WHERE id = NEW."sessionId" FOR SHARE;
    IF target_grant.id IS NULL OR target_grant."principalType" <> 'guest' OR
      target_session.id IS NULL OR target_session."expiresAt" < target_grant."expiresAt" THEN
      RAISE EXCEPTION 'code_access_binding_invalid' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF (NEW."revokedAt" IS NOT DISTINCT FROM OLD."revokedAt" OR (OLD."revokedAt" IS NULL AND NEW."revokedAt" IS NOT NULL)) AND
    (to_jsonb(NEW) - 'lastUsedAt' - 'revokedAt' - 'updatedAt') =
    (to_jsonb(OLD) - 'lastUsedAt' - 'revokedAt' - 'updatedAt') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'code_access_binding_immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER code_access_binding_guard
  BEFORE INSERT OR UPDATE OR DELETE ON code_access_session_bindings
  FOR EACH ROW EXECUTE FUNCTION guard_code_access_binding();

CREATE FUNCTION guard_code_access_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_grant code_access_grants%ROWTYPE; actor users%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'code_access_event_immutable' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO target_grant FROM code_access_grants WHERE id = NEW."grantId" FOR SHARE;
  IF target_grant.id IS NULL OR target_grant."codeId" IS DISTINCT FROM NEW."codeId" THEN
    RAISE EXCEPTION 'code_access_event_target_invalid' USING ERRCODE = '23514';
  END IF;
  IF NEW."actorType" = 'guest' THEN
    IF NEW."actorUserId" IS NOT NULL OR NEW."actorSessionVersion" IS NOT NULL OR NEW."sessionId" IS NULL THEN
      RAISE EXCEPTION 'code_access_event_actor_invalid' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW."actorType" = 'system' THEN
    IF NEW."actorUserId" IS NOT NULL OR NEW."actorSessionVersion" IS NOT NULL OR NEW."sessionId" IS NOT NULL THEN
      RAISE EXCEPTION 'code_access_event_actor_invalid' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT * INTO actor FROM users WHERE id = NEW."actorUserId" FOR SHARE;
    IF actor.id IS NULL OR NOT actor."isActive" OR actor."sessionVersion" IS DISTINCT FROM NEW."actorSessionVersion" OR
      (NEW."actorType" = 'account' AND (actor.role <> 'student' OR target_grant."userId" IS DISTINCT FROM actor.id)) OR
      (NEW."actorType" = 'admin' AND actor.role <> 'admin') THEN
      RAISE EXCEPTION 'code_access_event_actor_invalid' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER code_access_event_guard
  BEFORE INSERT OR UPDATE OR DELETE ON code_access_events
  FOR EACH ROW EXECUTE FUNCTION guard_code_access_event();

CREATE FUNCTION require_code_access_activation_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM code_access_events e WHERE e."grantId" = NEW.id AND e.type = 'activated'
  ) THEN
    RAISE EXCEPTION 'code_access_activation_audit_required' USING ERRCODE = '23514';
  END IF;
  IF NEW."principalType" = 'guest' AND NOT EXISTS (
    SELECT 1 FROM code_access_session_bindings b WHERE b."grantId" = NEW.id AND b."revokedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'code_access_guest_session_required' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER code_access_activation_audit
  AFTER INSERT ON code_access_grants DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION require_code_access_activation_audit();

CREATE FUNCTION enforce_code_access_browser_limit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allowed_count INTEGER; active_count INTEGER;
BEGIN
  SELECT c."maxBrowserSessions" INTO allowed_count
  FROM code_access_grants g JOIN subscription_codes c ON c.id = g."codeId"
  WHERE g.id = NEW."grantId";
  SELECT count(*) INTO active_count FROM code_access_session_bindings b
  WHERE b."grantId" = NEW."grantId" AND b."revokedAt" IS NULL;
  IF active_count > allowed_count THEN
    RAISE EXCEPTION 'code_access_browser_limit_exceeded' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER code_access_browser_limit
  AFTER INSERT OR UPDATE ON code_access_session_bindings DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_code_access_browser_limit();

CREATE FUNCTION require_code_access_grant_revocation_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."isActive" AND NOT NEW."isActive" AND NOT EXISTS (
    SELECT 1 FROM code_access_events e WHERE e."grantId" = NEW.id AND e.type = 'grant_revoked'
  ) THEN
    RAISE EXCEPTION 'code_access_grant_revocation_audit_required' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER code_access_grant_revocation_audit
  AFTER UPDATE ON code_access_grants DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION require_code_access_grant_revocation_audit();

CREATE OR REPLACE FUNCTION guard_subscription_code_state() RETURNS trigger LANGUAGE plpgsql AS $$
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

CREATE FUNCTION require_code_browser_limit_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."maxBrowserSessions" IS DISTINCT FROM OLD."maxBrowserSessions" AND NOT EXISTS (
    SELECT 1 FROM code_access_events e
    WHERE e."codeId" = NEW.id AND e.type = 'browser_limit_changed'
      AND e.xmin = (pg_current_xact_id()::text)::xid
      AND (e.metadata->>'before')::integer = OLD."maxBrowserSessions"
      AND (e.metadata->>'after')::integer = NEW."maxBrowserSessions"
  ) THEN
    RAISE EXCEPTION 'code_browser_limit_audit_required' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER code_browser_limit_audit
  AFTER UPDATE ON subscription_codes DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION require_code_browser_limit_audit();
