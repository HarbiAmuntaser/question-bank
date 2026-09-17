BEGIN;

-- P2/P3/P4 migrations and historical ownership, credentials and snapshots stay unchanged.
CREATE TYPE "PaymentReviewAction" AS ENUM ('submitted', 'receipt', 'refund', 'correction', 'additional_requested', 'approved', 'rejected', 'approval_blocked', 'note');
CREATE TYPE "PaymentLedgerKind" AS ENUM ('receipt', 'refund', 'void', 'correction');
ALTER TABLE payment_orders ADD COLUMN "reviewStartedAt" TIMESTAMPTZ(3), ADD COLUMN "reviewVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_orders DROP CONSTRAINT payment_order_cart_state;
ALTER TABLE payment_orders ADD CONSTRAINT payment_order_cart_state CHECK (
  (status = 'pending_payment' AND "activeCartKey" IS NOT NULL AND "activeCartKey" = "cartKey" AND "reviewStartedAt" IS NULL AND "reviewVersion" = 0)
  OR (status <> 'pending_payment' AND "activeCartKey" IS NULL)
);
ALTER TABLE payment_orders ADD CONSTRAINT payment_order_review_version CHECK ("reviewVersion" >= 0);

-- A physical write invalidates stale SERIALIZABLE snapshots after a row-lock wait.
-- SELECT FOR UPDATE alone does not do that when the competing writer only inserts a grant.
CREATE TABLE payment_account_locks (
  "userId" TEXT NOT NULL PRIMARY KEY, version BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT "payment_account_locks_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE FUNCTION lock_payment_account(target TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO payment_account_locks ("userId", version) VALUES (target, 1)
  ON CONFLICT ("userId") DO UPDATE SET version = payment_account_locks.version + 1;
END;
$$;

CREATE TABLE payment_review_events (
  id TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "actorSessionVersion" INTEGER NOT NULL,
  action "PaymentReviewAction" NOT NULL, version INTEGER NOT NULL,
  "fromStatus" "PaymentOrderStatus" NOT NULL, "toStatus" "PaymentOrderStatus" NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
  "internalNote" TEXT NOT NULL DEFAULT '', "studentMessage" TEXT, "conflictCode" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_review_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES payment_orders(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "payment_review_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES users(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT payment_review_values CHECK (version > 0 AND "actorSessionVersion" >= 0 AND length("internalNote") <= 2000 AND length("studentMessage") <= 1000)
);
CREATE UNIQUE INDEX "payment_review_events_orderId_idempotencyKey_key" ON payment_review_events("orderId", "idempotencyKey");
CREATE UNIQUE INDEX "payment_review_events_orderId_version_key" ON payment_review_events("orderId", version);
CREATE INDEX "payment_review_events_actorId_idx" ON payment_review_events("actorId");

CREATE TABLE payment_ledger_entries (
  id TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "eventId" TEXT NOT NULL,
  kind "PaymentLedgerKind" NOT NULL, amount DECIMAL(12,2) NOT NULL, reference TEXT, "sourceId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_ledger_entries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES payment_orders(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "payment_ledger_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES payment_review_events(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "payment_ledger_entries_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES payment_ledger_entries(id) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT payment_ledger_values CHECK (amount <> 0 AND (
    (kind IN ('receipt', 'refund') AND "sourceId" IS NULL AND reference IS NOT NULL AND reference = lower(btrim(reference)) AND length(reference) BETWEEN 3 AND 160 AND ((kind = 'receipt' AND amount > 0) OR (kind = 'refund' AND amount < 0)))
    OR (kind IN ('void', 'correction') AND "sourceId" IS NOT NULL AND reference IS NULL)
  ))
);
CREATE UNIQUE INDEX "payment_ledger_entries_reference_key" ON payment_ledger_entries(reference);
CREATE UNIQUE INDEX "payment_ledger_entries_sourceId_kind_key" ON payment_ledger_entries("sourceId", kind);
CREATE INDEX "payment_ledger_entries_orderId_createdAt_id_idx" ON payment_ledger_entries("orderId", "createdAt", id);
CREATE INDEX "payment_ledger_entries_eventId_idx" ON payment_ledger_entries("eventId");

ALTER TABLE access_entitlements ADD COLUMN "orderItemId" TEXT;
CREATE UNIQUE INDEX "access_entitlements_orderItemId_key" ON access_entitlements("orderItemId");
ALTER TABLE access_entitlements ADD CONSTRAINT "access_entitlements_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES payment_order_items(id) ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION guard_payment_order_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent payment_orders%ROWTYPE; valid BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' OR (TG_TABLE_NAME <> 'payment_orders' AND TG_OP = 'UPDATE') THEN
    RAISE EXCEPTION 'payment_order_history_immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'payment_orders' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'pending_payment' OR NEW."contactRequestedAt" IS NOT NULL OR NEW."reviewStartedAt" IS NOT NULL OR NEW."reviewVersion" <> 0 OR NOT EXISTS (
        SELECT 1 FROM users WHERE id = NEW."userId" AND role = 'student' AND "isActive" AND "emailVerified" IS NOT NULL
      ) THEN RAISE EXCEPTION 'payment_order_student_or_state_invalid' USING ERRCODE = '23514'; END IF;
    ELSE
      IF (to_jsonb(NEW) - 'status' - 'activeCartKey' - 'contactRequestedAt' - 'updatedAt' - 'reviewStartedAt' - 'reviewVersion') IS DISTINCT FROM
         (to_jsonb(OLD) - 'status' - 'activeCartKey' - 'contactRequestedAt' - 'updatedAt' - 'reviewStartedAt' - 'reviewVersion') THEN
        RAISE EXCEPTION 'payment_order_snapshot_immutable' USING ERRCODE = '23514';
      END IF;
      IF (OLD."contactRequestedAt" IS NOT NULL AND NEW."contactRequestedAt" IS DISTINCT FROM OLD."contactRequestedAt") OR
         (OLD."reviewStartedAt" IS NOT NULL AND NEW."reviewStartedAt" IS DISTINCT FROM OLD."reviewStartedAt") OR
         OLD.status = 'approved' THEN
        RAISE EXCEPTION 'payment_order_transition_not_allowed' USING ERRCODE = '23514';
      END IF;
      IF NEW."reviewVersion" = OLD."reviewVersion" THEN
        IF NOT ((NEW.status = OLD.status AND NEW."reviewStartedAt" IS NOT DISTINCT FROM OLD."reviewStartedAt" AND OLD.status IN ('pending_payment','pending_review','awaiting_additional_payment')) OR
          (OLD.status = 'pending_payment' AND NEW.status IN ('cancelled','expired') AND OLD."reviewStartedAt" IS NULL
           AND NOT EXISTS (SELECT 1 FROM payment_ledger_entries WHERE "orderId" = OLD.id)
           AND ((NEW.status = 'expired' AND NEW."expiresAt" <= CURRENT_TIMESTAMP) OR (NEW.status = 'cancelled' AND NEW."expiresAt" > CURRENT_TIMESTAMP)))) THEN
          RAISE EXCEPTION 'payment_order_transition_not_allowed' USING ERRCODE = '23514';
        END IF;
      ELSIF NEW."reviewVersion" <> OLD."reviewVersion" + 1 OR NEW."reviewStartedAt" IS NULL OR NEW.status NOT IN ('pending_review','awaiting_additional_payment','approved','rejected') THEN
        RAISE EXCEPTION 'payment_review_transition_invalid' USING ERRCODE = '23514';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'payment_order_items' THEN
    SELECT * INTO parent FROM payment_orders WHERE id = NEW."orderId";
    SELECT p."isActive" AND p."scopeType" = 'subject' AND p."majorId" IS NULL AND p."subjectId" = NEW."subjectId"
      AND payment_v1_subject_allowed(p."subjectId") AND p.currency = 'SAR' AND p.price = NEW.price
      AND p."defaultDurationDays" IS NOT DISTINCT FROM NEW."durationDays"
      AND p.title = NEW."planTitle" AND s.name = NEW."subjectName" AND u.name = NEW."universityName"
      AND CASE parent."contactMethod"
        WHEN 'whatsapp' THEN p."whatsappNumber" ~ '^\+?[0-9]{6,20}$' AND ltrim(p."whatsappNumber", '+') = parent."contactValue"
        WHEN 'telegram' THEN p."telegramUsername" ~ '^@?[a-zA-Z0-9_]{5,32}$' AND lower(ltrim(p."telegramUsername", '@')) = parent."contactValue"
      END INTO valid FROM paid_access_plans p JOIN subjects s ON s.id = p."subjectId" JOIN majors m ON m.id = s."majorId"
      JOIN universities u ON u.id = m."universityId" WHERE p.id = NEW."planId";
    IF parent.id IS NULL OR parent.status <> 'pending_payment' OR NOT coalesce(valid, false) THEN
      RAISE EXCEPTION 'payment_order_scope_or_snapshot_invalid' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT * INTO parent FROM payment_orders WHERE id = NEW."orderId";
    IF parent.id IS NULL OR (NEW.type = 'expired' AND (NEW."actorId" IS NOT NULL OR parent.status <> 'expired')) OR
      (NEW.type <> 'expired' AND NEW."actorId" IS DISTINCT FROM parent."userId") OR
      (NEW.type = 'created' AND parent.status <> 'pending_payment') OR
      (NEW.type = 'cancelled' AND parent.status <> 'cancelled') OR
      (NEW.type = 'contact_requested' AND (parent.status NOT IN ('pending_payment','pending_review','awaiting_additional_payment') OR parent."contactRequestedAt" IS NULL)) THEN
      RAISE EXCEPTION 'payment_order_event_invalid' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION guard_payment_review_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent payment_orders%ROWTYPE; actor users%ROWTYPE; event payment_review_events%ROWTYPE; source payment_ledger_entries%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'payment_review_history_immutable' USING ERRCODE = '23514'; END IF;
  SELECT * INTO parent FROM payment_orders WHERE id = NEW."orderId" FOR UPDATE;
  IF TG_TABLE_NAME = 'payment_review_events' THEN
    SELECT * INTO actor FROM users WHERE id = NEW."actorId" FOR UPDATE;
    IF actor.id IS NULL OR NOT actor."isActive" OR actor."sessionVersion" <> NEW."actorSessionVersion" OR
      NOT (actor.role = 'admin' OR (actor.role = 'student' AND actor.id = parent."userId" AND actor."emailVerified" IS NOT NULL AND NEW.action = 'submitted' AND NEW."internalNote" = '' AND NEW."studentMessage" IS NULL AND NEW."conflictCode" IS NULL)) THEN
      RAISE EXCEPTION 'payment_review_actor_invalid' USING ERRCODE = '23514';
    END IF;
    IF parent.id IS NULL OR NEW.version <> parent."reviewVersion" + 1 OR NEW."fromStatus" <> parent.status OR parent.status = 'approved' OR
      (NEW.action = 'submitted' AND (parent.status NOT IN ('pending_payment','awaiting_additional_payment') OR (parent.status = 'pending_payment' AND parent."expiresAt" <= CURRENT_TIMESTAMP) OR NEW."toStatus" <> 'pending_review')) OR
      (NEW.action IN ('receipt','refund','correction') AND NEW."toStatus" <> 'pending_review') OR
      (NEW.action IN ('additional_requested','approved','rejected','approval_blocked','note') AND parent.status NOT IN ('pending_review','awaiting_additional_payment')) OR
      (NEW.action = 'additional_requested' AND NEW."toStatus" <> 'awaiting_additional_payment') OR
      (NEW.action = 'approved' AND NEW."toStatus" <> 'approved') OR
      (NEW.action = 'rejected' AND NEW."toStatus" <> 'rejected') OR
      (NEW.action IN ('note','approval_blocked') AND NEW."toStatus" <> parent.status) OR
      (NEW.action <> 'submitted' AND length(btrim(NEW."internalNote")) = 0) OR
      (NEW.action IN ('additional_requested','rejected') AND coalesce(length(btrim(NEW."studentMessage")),0) = 0) THEN
      RAISE EXCEPTION 'payment_review_event_invalid' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT * INTO event FROM payment_review_events WHERE id = NEW."eventId";
    IF event.id IS NULL OR event."orderId" <> NEW."orderId" OR event.version <> parent."reviewVersion" + 1 OR
       NOT ((NEW.kind = 'receipt' AND event.action = 'receipt') OR (NEW.kind = 'refund' AND event.action = 'refund') OR (NEW.kind IN ('void','correction') AND event.action = 'correction')) THEN
      RAISE EXCEPTION 'payment_ledger_event_invalid' USING ERRCODE = '23514';
    END IF;
    IF NEW."sourceId" IS NOT NULL THEN
      SELECT * INTO source FROM payment_ledger_entries WHERE id = NEW."sourceId";
      IF source.id IS NULL OR source."orderId" <> NEW."orderId" OR source.kind = 'void' OR
        (NEW.kind = 'void' AND NEW.amount <> -source.amount) OR
        (NEW.kind = 'correction' AND (sign(NEW.amount) <> sign(source.amount) OR NOT EXISTS (
          SELECT 1 FROM payment_ledger_entries WHERE "sourceId" = source.id AND kind = 'void' AND "eventId" = NEW."eventId"
        ))) THEN RAISE EXCEPTION 'payment_ledger_correction_invalid' USING ERRCODE = '23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER payment_review_write_guard BEFORE INSERT OR UPDATE OR DELETE ON payment_review_events FOR EACH ROW EXECUTE FUNCTION guard_payment_review_write();
CREATE TRIGGER payment_ledger_write_guard BEFORE INSERT OR UPDATE OR DELETE ON payment_ledger_entries FOR EACH ROW EXECUTE FUNCTION guard_payment_review_write();

CREATE FUNCTION validate_payment_review_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target TEXT; parent payment_orders%ROWTYPE; event payment_review_events%ROWTYPE; net NUMERIC; grants INTEGER; financial_count INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'payment_orders' THEN target := NEW.id;
  ELSIF TG_TABLE_NAME = 'access_entitlements' THEN
    SELECT "orderId" INTO target FROM payment_order_items WHERE id = NEW."orderItemId";
    IF target IS NULL THEN RETURN NULL; END IF;
  ELSE target := NEW."orderId"; END IF;
  SELECT * INTO parent FROM payment_orders WHERE id = target;
  SELECT coalesce(sum(amount),0), count(*) INTO net, financial_count FROM payment_ledger_entries WHERE "orderId" = target;
  SELECT * INTO event FROM payment_review_events WHERE "orderId" = target ORDER BY version DESC LIMIT 1;
  IF (parent."reviewVersion" > 0 AND (event.id IS NULL OR event.version <> parent."reviewVersion" OR event."toStatus" <> parent.status OR parent."reviewStartedAt" IS NULL)) OR
     (parent."reviewVersion" = 0 AND event.id IS NOT NULL) OR
     (financial_count > 0 AND parent.status IN ('pending_payment','expired','cancelled')) OR
     (parent.status IN ('pending_review','awaiting_additional_payment','approved','rejected') AND event.id IS NULL) THEN
    RAISE EXCEPTION 'payment_review_unbalanced' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'payment_review_events' THEN
    IF (NEW.action IN ('receipt','refund','correction') AND NOT EXISTS (SELECT 1 FROM payment_ledger_entries WHERE "eventId" = NEW.id)) OR
       (NEW.action NOT IN ('receipt','refund','correction') AND EXISTS (SELECT 1 FROM payment_ledger_entries WHERE "eventId" = NEW.id)) THEN
      RAISE EXCEPTION 'payment_review_ledger_missing' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF (event.action = 'rejected' AND net <> 0) OR (event.action = 'additional_requested' AND (net < 0 OR net >= parent.total)) THEN
    RAISE EXCEPTION 'payment_review_financial_conflict' USING ERRCODE = '23514';
  END IF;
  SELECT count(*) INTO grants FROM access_entitlements a JOIN payment_order_items i ON i.id = a."orderItemId" WHERE i."orderId" = target;
  IF (parent.status = 'approved' AND (net <> parent.total OR grants <> parent."itemCount" OR event.action <> 'approved')) OR
     (parent.status <> 'approved' AND grants <> 0) THEN
    RAISE EXCEPTION 'payment_approval_incomplete' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER payment_review_balance AFTER INSERT ON payment_review_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_payment_review_balance();
CREATE CONSTRAINT TRIGGER payment_ledger_balance AFTER INSERT ON payment_ledger_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_payment_review_balance();
CREATE CONSTRAINT TRIGGER payment_order_review_balance AFTER INSERT OR UPDATE ON payment_orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_payment_review_balance();
CREATE CONSTRAINT TRIGGER payment_grant_review_balance AFTER INSERT ON access_entitlements DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_payment_review_balance();

CREATE FUNCTION guard_order_entitlement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item payment_order_items%ROWTYPE; parent payment_orders%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."orderItemId" IS NOT NULL THEN RAISE EXCEPTION 'payment_grant_history_immutable' USING ERRCODE = '23514'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW."orderItemId" IS DISTINCT FROM OLD."orderItemId" OR (OLD."orderItemId" IS NOT NULL AND
      (to_jsonb(NEW) - 'isActive' - 'updatedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'isActive' - 'updatedAt')) OR
      (OLD."orderItemId" IS NOT NULL AND NOT OLD."isActive" AND NEW."isActive") THEN
      RAISE EXCEPTION 'payment_grant_link_immutable' USING ERRCODE = '23514';
    END IF;
    IF NEW."userId" IS NOT NULL THEN
      PERFORM id FROM users WHERE id = NEW."userId" FOR UPDATE;
      PERFORM lock_payment_account(NEW."userId");
    END IF;
    RETURN NEW;
  END IF;
  -- Serialize every account grant writer, including code redemption, with order approval.
  IF NEW."userId" IS NOT NULL THEN
    PERFORM id FROM users WHERE id = NEW."userId" FOR UPDATE;
    PERFORM lock_payment_account(NEW."userId");
  END IF;
  IF NEW."orderItemId" IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO item FROM payment_order_items WHERE id = NEW."orderItemId";
  SELECT * INTO parent FROM payment_orders WHERE id = item."orderId";
  IF item.id IS NULL OR parent.status <> 'approved' OR NEW."userId" IS DISTINCT FROM parent."userId" OR
    NEW."subjectId" IS DISTINCT FROM item."subjectId" OR NEW."codeId" IS NOT NULL OR NOT NEW."isActive" OR
    NEW."anonymousSessionId" IS NOT NULL OR NEW."scopeType" <> 'subject' OR NEW."majorId" IS NOT NULL OR
    NOT payment_v1_subject_allowed(item."subjectId") OR
    NEW."startsAt" IS DISTINCT FROM (SELECT "createdAt" AT TIME ZONE 'UTC' FROM payment_review_events WHERE "orderId" = parent.id AND version = parent."reviewVersion" AND action = 'approved') OR
    (item."durationDays" IS NULL AND NEW."expiresAt" IS NOT NULL) OR
    (item."durationDays" IS NOT NULL AND NEW."expiresAt" IS DISTINCT FROM NEW."startsAt" + item."durationDays" * interval '24 hours') OR
    EXISTS (SELECT 1 FROM access_entitlements WHERE "userId" = NEW."userId" AND "subjectId" = NEW."subjectId" AND "scopeType" = 'subject' AND "isActive"
      AND ("expiresAt" IS NULL OR "expiresAt" > NEW."startsAt")) THEN
    RAISE EXCEPTION 'payment_grant_conflict' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER order_entitlement_guard BEFORE INSERT OR UPDATE OR DELETE ON access_entitlements FOR EACH ROW EXECUTE FUNCTION guard_order_entitlement();

COMMIT;
