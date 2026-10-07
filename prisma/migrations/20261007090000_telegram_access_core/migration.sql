BEGIN;

CREATE TYPE "TelegramChannelStatus" AS ENUM ('connected', 'degraded', 'disconnected');
CREATE TYPE "TelegramMembershipPrincipalType" AS ENUM ('account', 'guest_grant');
CREATE TYPE "TelegramMembershipStatus" AS ENUM ('pending_join', 'active', 'left', 'removal_pending', 'removed', 'error');
CREATE TYPE "TelegramLinkTokenPurpose" AS ENUM ('admin_connect', 'student_link');
CREATE TYPE "TelegramLinkTokenState" AS ENUM ('pending', 'claimed', 'consumed', 'cancelled', 'expired');
CREATE TYPE "TelegramSyncJobType" AS ENUM ('reconcile_membership', 'verify_channel', 'mass_remove');
CREATE TYPE "TelegramSyncJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE telegram_subject_channels (
  id TEXT PRIMARY KEY,
  "subjectId" TEXT NOT NULL,
  "telegramChatId" VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status "TelegramChannelStatus" NOT NULL DEFAULT 'disconnected',
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "botCanInviteUsers" BOOLEAN NOT NULL DEFAULT false,
  "botCanRestrictMembers" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMPTZ(3),
  "lastHealthCheckedAt" TIMESTAMPTZ(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT telegram_subject_channels_chat_id_format
    CHECK ("telegramChatId" ~ '^-[1-9][0-9]{0,19}$'),
  CONSTRAINT telegram_subject_channels_title_check
    CHECK (length(btrim(title)) BETWEEN 1 AND 255),
  CONSTRAINT telegram_subject_channels_connected_check
    CHECK (status <> 'connected' OR (
      "verifiedAt" IS NOT NULL AND "botCanInviteUsers" AND "botCanRestrictMembers"
    )),
  CONSTRAINT "telegram_subject_channels_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES subjects(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "telegram_subject_channels_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "telegram_subject_channels_subjectId_key" ON telegram_subject_channels("subjectId");
CREATE UNIQUE INDEX "telegram_subject_channels_telegramChatId_key" ON telegram_subject_channels("telegramChatId");
CREATE INDEX "telegram_subject_channels_isEnabled_status_idx" ON telegram_subject_channels("isEnabled", status);
CREATE INDEX "telegram_subject_channels_lastHealthCheckedAt_idx" ON telegram_subject_channels("lastHealthCheckedAt");

CREATE TABLE telegram_memberships (
  id TEXT PRIMARY KEY,
  "channelId" TEXT NOT NULL,
  "principalType" "TelegramMembershipPrincipalType" NOT NULL,
  "userId" TEXT,
  "codeAccessGrantId" TEXT,
  "telegramUserId" VARCHAR(32) NOT NULL,
  status "TelegramMembershipStatus" NOT NULL DEFAULT 'pending_join',
  "accessExpiresAt" TIMESTAMPTZ(3),
  "nextCheckAt" TIMESTAMPTZ(3),
  "joinedAt" TIMESTAMPTZ(3),
  "leftAt" TIMESTAMPTZ(3),
  "removedAt" TIMESTAMPTZ(3),
  "lastVerifiedAt" TIMESTAMPTZ(3),
  "lastErrorCode" VARCHAR(100),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT telegram_memberships_user_id_format
    CHECK ("telegramUserId" ~ '^[1-9][0-9]{0,19}$'),
  CONSTRAINT telegram_memberships_principal_check CHECK (
    ("principalType" = 'account' AND "userId" IS NOT NULL AND "codeAccessGrantId" IS NULL) OR
    ("principalType" = 'guest_grant' AND "userId" IS NULL AND "codeAccessGrantId" IS NOT NULL)
  ),
  CONSTRAINT telegram_memberships_state_times_check CHECK (
    (status <> 'active' OR "joinedAt" IS NOT NULL) AND
    (status <> 'removed' OR "removedAt" IS NOT NULL)
  ),
  CONSTRAINT "telegram_memberships_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES telegram_subject_channels(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "telegram_memberships_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "telegram_memberships_codeAccessGrantId_fkey"
    FOREIGN KEY ("codeAccessGrantId") REFERENCES code_access_grants(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "telegram_memberships_channelId_telegramUserId_key" ON telegram_memberships("channelId", "telegramUserId");
CREATE UNIQUE INDEX "telegram_memberships_channelId_userId_key" ON telegram_memberships("channelId", "userId");
CREATE UNIQUE INDEX "telegram_memberships_channelId_codeAccessGrantId_key" ON telegram_memberships("channelId", "codeAccessGrantId");
CREATE INDEX "telegram_memberships_status_nextCheckAt_idx" ON telegram_memberships(status, "nextCheckAt");
CREATE INDEX "telegram_memberships_userId_status_idx" ON telegram_memberships("userId", status);
CREATE INDEX "telegram_memberships_codeAccessGrantId_status_idx" ON telegram_memberships("codeAccessGrantId", status);

CREATE TABLE telegram_link_tokens (
  id TEXT PRIMARY KEY,
  "tokenHash" VARCHAR(64) NOT NULL,
  purpose "TelegramLinkTokenPurpose" NOT NULL,
  state "TelegramLinkTokenState" NOT NULL DEFAULT 'pending',
  "activeKey" VARCHAR(160),
  "subjectId" TEXT NOT NULL,
  "channelId" TEXT,
  "userId" TEXT,
  "userSessionVersion" INTEGER,
  "codeAccessGrantId" TEXT,
  "telegramUserId" VARCHAR(32),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "claimedAt" TIMESTAMPTZ(3),
  "consumedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT telegram_link_tokens_hash_format CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT telegram_link_tokens_window_check CHECK ("createdAt" < "expiresAt"),
  CONSTRAINT telegram_link_tokens_telegram_user_format
    CHECK ("telegramUserId" IS NULL OR "telegramUserId" ~ '^[1-9][0-9]{0,19}$'),
  CONSTRAINT telegram_link_tokens_purpose_check CHECK (
    (purpose = 'admin_connect' AND "userId" IS NOT NULL AND "userSessionVersion" IS NOT NULL AND
      "channelId" IS NULL AND "codeAccessGrantId" IS NULL) OR
    (purpose = 'student_link' AND "channelId" IS NOT NULL AND (
      ("userId" IS NOT NULL AND "userSessionVersion" IS NOT NULL AND "codeAccessGrantId" IS NULL) OR
      ("userId" IS NULL AND "userSessionVersion" IS NULL AND "codeAccessGrantId" IS NOT NULL)
    ))
  ),
  CONSTRAINT telegram_link_tokens_state_check CHECK (
    (state IN ('pending', 'claimed') AND "activeKey" IS NOT NULL) OR
    (state IN ('consumed', 'cancelled', 'expired') AND "activeKey" IS NULL)
  ),
  CONSTRAINT telegram_link_tokens_claim_check CHECK (
    (state = 'pending' AND "telegramUserId" IS NULL AND "claimedAt" IS NULL AND "consumedAt" IS NULL) OR
    (state = 'claimed' AND "telegramUserId" IS NOT NULL AND "claimedAt" IS NOT NULL AND "consumedAt" IS NULL) OR
    (state = 'consumed' AND "telegramUserId" IS NOT NULL AND "claimedAt" IS NOT NULL AND "consumedAt" IS NOT NULL) OR
    state IN ('cancelled', 'expired')
  ),
  CONSTRAINT "telegram_link_tokens_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES subjects(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "telegram_link_tokens_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES telegram_subject_channels(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "telegram_link_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "telegram_link_tokens_codeAccessGrantId_fkey"
    FOREIGN KEY ("codeAccessGrantId") REFERENCES code_access_grants(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "telegram_link_tokens_tokenHash_key" ON telegram_link_tokens("tokenHash");
CREATE UNIQUE INDEX "telegram_link_tokens_activeKey_key" ON telegram_link_tokens("activeKey");
CREATE INDEX "telegram_link_tokens_expiresAt_state_idx" ON telegram_link_tokens("expiresAt", state);
CREATE INDEX "telegram_link_tokens_subjectId_purpose_state_idx" ON telegram_link_tokens("subjectId", purpose, state);
CREATE INDEX "telegram_link_tokens_channelId_state_idx" ON telegram_link_tokens("channelId", state);

CREATE TABLE telegram_audit_events (
  id TEXT PRIMARY KEY,
  "eventType" VARCHAR(64) NOT NULL,
  "actorType" VARCHAR(32) NOT NULL,
  "actorUserId" TEXT,
  "telegramUserId" VARCHAR(32),
  "channelId" TEXT,
  "membershipId" TEXT,
  "linkTokenId" TEXT,
  "telegramUpdateId" VARCHAR(32),
  "idempotencyKey" VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT telegram_audit_events_type_format CHECK ("eventType" ~ '^[a-z][a-z0-9_]{2,63}$'),
  CONSTRAINT telegram_audit_events_actor_check CHECK (
    ("actorType" IN ('admin', 'account') AND "actorUserId" IS NOT NULL) OR
    ("actorType" IN ('guest', 'telegram', 'system') AND "actorUserId" IS NULL)
  ),
  CONSTRAINT telegram_audit_events_telegram_user_format
    CHECK ("telegramUserId" IS NULL OR "telegramUserId" ~ '^[1-9][0-9]{0,19}$'),
  CONSTRAINT telegram_audit_events_update_format
    CHECK ("telegramUpdateId" IS NULL OR "telegramUpdateId" ~ '^[0-9]{1,32}$'),
  CONSTRAINT telegram_audit_events_idempotency_format
    CHECK ("idempotencyKey" ~ '^[A-Za-z0-9:_-]{8,100}$'),
  CONSTRAINT telegram_audit_events_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT "telegram_audit_events_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "telegram_audit_events_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES telegram_subject_channels(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "telegram_audit_events_membershipId_fkey"
    FOREIGN KEY ("membershipId") REFERENCES telegram_memberships(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "telegram_audit_events_linkTokenId_fkey"
    FOREIGN KEY ("linkTokenId") REFERENCES telegram_link_tokens(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "telegram_audit_events_telegramUpdateId_key" ON telegram_audit_events("telegramUpdateId");
CREATE UNIQUE INDEX "telegram_audit_events_idempotencyKey_key" ON telegram_audit_events("idempotencyKey");
CREATE INDEX "telegram_audit_events_channelId_createdAt_id_idx" ON telegram_audit_events("channelId", "createdAt", id);
CREATE INDEX "telegram_audit_events_membershipId_createdAt_id_idx" ON telegram_audit_events("membershipId", "createdAt", id);
CREATE INDEX "telegram_audit_events_actorUserId_createdAt_id_idx" ON telegram_audit_events("actorUserId", "createdAt", id);
CREATE INDEX "telegram_audit_events_eventType_createdAt_idx" ON telegram_audit_events("eventType", "createdAt");

CREATE TABLE telegram_sync_jobs (
  id TEXT PRIMARY KEY,
  type "TelegramSyncJobType" NOT NULL,
  status "TelegramSyncJobStatus" NOT NULL DEFAULT 'pending',
  "channelId" TEXT NOT NULL,
  "membershipId" TEXT,
  "dedupeKey" VARCHAR(160) NOT NULL,
  "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempts INTEGER NOT NULL DEFAULT 0,
  "lockedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "lastErrorCode" VARCHAR(100),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT telegram_sync_jobs_attempts_check CHECK (attempts >= 0),
  CONSTRAINT telegram_sync_jobs_target_check CHECK (
    (type = 'reconcile_membership' AND "membershipId" IS NOT NULL) OR
    (type IN ('verify_channel', 'mass_remove') AND "membershipId" IS NULL)
  ),
  CONSTRAINT telegram_sync_jobs_state_check CHECK (
    (status = 'processing' AND "lockedAt" IS NOT NULL AND "completedAt" IS NULL) OR
    (status = 'completed' AND "completedAt" IS NOT NULL) OR
    (status IN ('pending', 'failed') AND "completedAt" IS NULL)
  ),
  CONSTRAINT "telegram_sync_jobs_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES telegram_subject_channels(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "telegram_sync_jobs_membershipId_fkey"
    FOREIGN KEY ("membershipId") REFERENCES telegram_memberships(id) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "telegram_sync_jobs_dedupeKey_key" ON telegram_sync_jobs("dedupeKey");
CREATE INDEX "telegram_sync_jobs_status_availableAt_createdAt_idx" ON telegram_sync_jobs(status, "availableAt", "createdAt");
CREATE INDEX "telegram_sync_jobs_membershipId_status_idx" ON telegram_sync_jobs("membershipId", status);

CREATE FUNCTION guard_telegram_subject_channel() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor users%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'telegram_channel_delete_not_supported' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO actor FROM users WHERE id = NEW."createdBy" FOR SHARE;
  IF actor.id IS NULL OR NOT actor."isActive" OR actor.role <> 'admin' THEN
    RAISE EXCEPTION 'telegram_channel_admin_invalid' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER telegram_subject_channel_guard
  BEFORE INSERT OR UPDATE OR DELETE ON telegram_subject_channels
  FOR EACH ROW EXECUTE FUNCTION guard_telegram_subject_channel();

CREATE FUNCTION validate_telegram_link_target(target telegram_link_tokens) RETURNS void LANGUAGE plpgsql AS $$
DECLARE target_channel telegram_subject_channels%ROWTYPE; target_user users%ROWTYPE; target_grant code_access_grants%ROWTYPE;
BEGIN
  SELECT * INTO target_user FROM users WHERE id = target."userId" FOR SHARE;
  IF target.purpose = 'admin_connect' THEN
    IF target.state IN ('pending', 'claimed') AND (
      target_user.id IS NULL OR NOT target_user."isActive" OR target_user.role <> 'admin' OR
      target_user."sessionVersion" IS DISTINCT FROM target."userSessionVersion" OR
      target."activeKey" IS DISTINCT FROM ('admin:' || target."userId")
    ) THEN
      RAISE EXCEPTION 'telegram_admin_connect_target_invalid' USING ERRCODE = '23514';
    END IF;
    RETURN;
  END IF;
  SELECT * INTO target_channel FROM telegram_subject_channels WHERE id = target."channelId" FOR SHARE;
  IF target_channel.id IS NULL OR target_channel."subjectId" IS DISTINCT FROM target."subjectId" OR
    (target.state IN ('pending', 'claimed') AND (
      NOT target_channel."isEnabled" OR target_channel.status <> 'connected' OR
      NOT target_channel."botCanInviteUsers" OR NOT target_channel."botCanRestrictMembers"
    )) THEN
    RAISE EXCEPTION 'telegram_student_link_channel_invalid' USING ERRCODE = '23514';
  END IF;
  IF target."userId" IS NOT NULL THEN
    IF target.state IN ('pending', 'claimed') AND (
      target_user.id IS NULL OR NOT target_user."isActive" OR target_user.role <> 'student' OR
      target_user."emailVerified" IS NULL OR target_user."sessionVersion" IS DISTINCT FROM target."userSessionVersion"
    ) THEN
      RAISE EXCEPTION 'telegram_student_link_user_invalid' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT * INTO target_grant FROM code_access_grants WHERE id = target."codeAccessGrantId" FOR SHARE;
    IF target_grant.id IS NULL OR target_grant."principalType" <> 'guest' OR
      target_grant."subjectId" IS DISTINCT FROM target."subjectId" THEN
      RAISE EXCEPTION 'telegram_student_link_grant_invalid' USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;

CREATE FUNCTION guard_telegram_link_token() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'telegram_link_token_delete_not_supported' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM validate_telegram_link_target(NEW);
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'state' - 'activeKey' - 'telegramUserId' - 'claimedAt' - 'consumedAt' - 'updatedAt') IS DISTINCT FROM
     (to_jsonb(OLD) - 'state' - 'activeKey' - 'telegramUserId' - 'claimedAt' - 'consumedAt' - 'updatedAt') THEN
    RAISE EXCEPTION 'telegram_link_token_immutable_fields' USING ERRCODE = '23514';
  END IF;
  IF OLD.state = NEW.state THEN
    IF (to_jsonb(NEW) - 'updatedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'updatedAt') THEN
      RAISE EXCEPTION 'telegram_link_token_immutable_fields' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  ELSIF OLD.state = 'pending' AND NEW.state = 'claimed' THEN
    IF NEW."activeKey" IS DISTINCT FROM OLD."activeKey" OR NEW."telegramUserId" IS NULL OR
      NEW."claimedAt" IS NULL OR NEW."consumedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'telegram_link_token_transition_invalid' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD.state = 'pending' AND NEW.state IN ('cancelled', 'expired') THEN
    IF NEW."activeKey" IS NOT NULL OR NEW."telegramUserId" IS DISTINCT FROM OLD."telegramUserId" OR
      NEW."claimedAt" IS DISTINCT FROM OLD."claimedAt" OR NEW."consumedAt" IS DISTINCT FROM OLD."consumedAt" THEN
      RAISE EXCEPTION 'telegram_link_token_transition_invalid' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD.state = 'claimed' AND NEW.state = 'consumed' THEN
    IF NEW."activeKey" IS NOT NULL OR NEW."telegramUserId" IS DISTINCT FROM OLD."telegramUserId" OR
      NEW."claimedAt" IS DISTINCT FROM OLD."claimedAt" OR NEW."consumedAt" IS NULL THEN
      RAISE EXCEPTION 'telegram_link_token_transition_invalid' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD.state = 'claimed' AND NEW.state IN ('cancelled', 'expired') THEN
    IF NEW."activeKey" IS NOT NULL OR NEW."telegramUserId" IS DISTINCT FROM OLD."telegramUserId" OR
      NEW."claimedAt" IS DISTINCT FROM OLD."claimedAt" OR NEW."consumedAt" IS DISTINCT FROM OLD."consumedAt" THEN
      RAISE EXCEPTION 'telegram_link_token_transition_invalid' USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'telegram_link_token_transition_invalid' USING ERRCODE = '23514';
  END IF;
  PERFORM validate_telegram_link_target(NEW);
  RETURN NEW;
END;
$$;
CREATE TRIGGER telegram_link_token_guard
  BEFORE INSERT OR UPDATE OR DELETE ON telegram_link_tokens
  FOR EACH ROW EXECUTE FUNCTION guard_telegram_link_token();

CREATE FUNCTION guard_telegram_membership() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_channel telegram_subject_channels%ROWTYPE; target_user users%ROWTYPE; target_grant code_access_grants%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'telegram_membership_delete_not_supported' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO target_channel FROM telegram_subject_channels WHERE id = NEW."channelId" FOR SHARE;
  IF target_channel.id IS NULL THEN
    RAISE EXCEPTION 'telegram_membership_channel_invalid' USING ERRCODE = '23514';
  END IF;
  IF NEW."principalType" = 'account' THEN
    SELECT * INTO target_user FROM users WHERE id = NEW."userId" FOR SHARE;
    IF target_user.id IS NULL OR target_user.role <> 'student' THEN
      RAISE EXCEPTION 'telegram_membership_user_invalid' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT * INTO target_grant FROM code_access_grants WHERE id = NEW."codeAccessGrantId" FOR SHARE;
    IF target_grant.id IS NULL OR target_grant."principalType" <> 'guest' OR
      target_grant."subjectId" IS DISTINCT FROM target_channel."subjectId" THEN
      RAISE EXCEPTION 'telegram_membership_grant_invalid' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER telegram_membership_guard
  BEFORE INSERT OR UPDATE OR DELETE ON telegram_memberships
  FOR EACH ROW EXECUTE FUNCTION guard_telegram_membership();

CREATE FUNCTION guard_telegram_audit_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'telegram_audit_immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER telegram_audit_event_guard
  BEFORE UPDATE OR DELETE ON telegram_audit_events
  FOR EACH ROW EXECUTE FUNCTION guard_telegram_audit_event();

COMMIT;
