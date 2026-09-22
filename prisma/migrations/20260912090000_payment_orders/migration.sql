BEGIN;

-- Additive only: legacy requests and account entitlements are not rewritten.
CREATE TYPE "PaymentOrderStatus" AS ENUM ('pending_payment', 'pending_review', 'awaiting_additional_payment', 'approved', 'rejected', 'cancelled', 'expired');
CREATE TYPE "PaymentOrderEventType" AS ENUM ('created', 'contact_requested', 'cancelled', 'expired');

CREATE TABLE "payment_orders" (
  "id" TEXT NOT NULL, "reference" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "cartKey" TEXT NOT NULL, "activeCartKey" TEXT,
  "status" "PaymentOrderStatus" NOT NULL DEFAULT 'pending_payment', "currency" TEXT NOT NULL DEFAULT 'SAR',
  "total" DECIMAL(12,2) NOT NULL, "itemCount" INTEGER NOT NULL,
  "contactMethod" "ContactMethod" NOT NULL, "contactValue" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL, "contactRequestedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "payment_order_values" CHECK ("currency" = 'SAR' AND "total" > 0 AND "itemCount" BETWEEN 1 AND 10 AND "expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + interval '7 days'),
  CONSTRAINT "payment_order_cart_state" CHECK (("status" IN ('cancelled', 'expired', 'approved', 'rejected') AND "activeCartKey" IS NULL) OR ("status" NOT IN ('cancelled', 'expired', 'approved', 'rejected') AND "activeCartKey" IS NOT NULL AND "activeCartKey" = "cartKey"))
);
CREATE UNIQUE INDEX "payment_orders_reference_key" ON "payment_orders"("reference");
CREATE UNIQUE INDEX "payment_orders_userId_idempotencyKey_key" ON "payment_orders"("userId", "idempotencyKey");
CREATE UNIQUE INDEX "payment_orders_userId_activeCartKey_key" ON "payment_orders"("userId", "activeCartKey");
CREATE INDEX "payment_orders_userId_createdAt_id_idx" ON "payment_orders"("userId", "createdAt", "id");
CREATE INDEX "payment_orders_status_expiresAt_idx" ON "payment_orders"("status", "expiresAt");

CREATE TABLE "payment_order_items" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "subjectId" TEXT NOT NULL, "planId" TEXT NOT NULL,
  "subjectName" TEXT NOT NULL, "universityName" TEXT NOT NULL, "planTitle" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL, "durationDays" INTEGER,
  CONSTRAINT "payment_order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "payment_orders"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "payment_order_items_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "payment_order_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "paid_access_plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "payment_order_item_values" CHECK ("price" > 0 AND ("durationDays" IS NULL OR "durationDays" BETWEEN 1 AND 36500))
);
CREATE UNIQUE INDEX "payment_order_items_orderId_subjectId_key" ON "payment_order_items"("orderId", "subjectId");
CREATE INDEX "payment_order_items_subjectId_idx" ON "payment_order_items"("subjectId");
CREATE INDEX "payment_order_items_planId_idx" ON "payment_order_items"("planId");

CREATE TABLE "payment_order_events" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "actorId" TEXT, "type" "PaymentOrderEventType" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_order_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "payment_orders"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "payment_order_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "payment_order_events_orderId_type_key" ON "payment_order_events"("orderId", "type");
CREATE INDEX "payment_order_events_actorId_idx" ON "payment_order_events"("actorId");

CREATE FUNCTION guard_payment_order_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent payment_orders%ROWTYPE; valid BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' OR (TG_TABLE_NAME <> 'payment_orders' AND TG_OP = 'UPDATE') THEN
    RAISE EXCEPTION 'payment_order_history_immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'payment_orders' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW."status" <> 'pending_payment' OR NEW."contactRequestedAt" IS NOT NULL OR NOT EXISTS (
        SELECT 1 FROM users WHERE id = NEW."userId" AND role = 'student' AND "isActive" AND "emailVerified" IS NOT NULL
      ) THEN RAISE EXCEPTION 'payment_order_student_or_state_invalid' USING ERRCODE = '23514'; END IF;
    ELSE
      IF (to_jsonb(NEW) - 'status' - 'activeCartKey' - 'contactRequestedAt' - 'updatedAt') IS DISTINCT FROM
         (to_jsonb(OLD) - 'status' - 'activeCartKey' - 'contactRequestedAt' - 'updatedAt') THEN
        RAISE EXCEPTION 'payment_order_snapshot_immutable' USING ERRCODE = '23514';
      END IF;
      IF OLD."status" <> 'pending_payment' OR NEW."status" NOT IN ('pending_payment', 'cancelled', 'expired') OR
        (NEW."status" = 'expired' AND NEW."expiresAt" > CURRENT_TIMESTAMP) OR
        (NEW."status" = 'cancelled' AND NEW."expiresAt" <= CURRENT_TIMESTAMP) OR
        (OLD."contactRequestedAt" IS NOT NULL AND NEW."contactRequestedAt" IS DISTINCT FROM OLD."contactRequestedAt") THEN
        RAISE EXCEPTION 'payment_order_transition_not_allowed' USING ERRCODE = '23514';
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
      END INTO valid
      FROM paid_access_plans p JOIN subjects s ON s.id = p."subjectId" JOIN majors m ON m.id = s."majorId"
      JOIN universities u ON u.id = m."universityId" WHERE p.id = NEW."planId";
    IF parent.id IS NULL OR parent.status <> 'pending_payment' OR NOT coalesce(valid, false) THEN
      RAISE EXCEPTION 'payment_order_scope_or_snapshot_invalid' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT * INTO parent FROM payment_orders WHERE id = NEW."orderId";
    IF parent.id IS NULL OR (NEW."type" = 'expired' AND (NEW."actorId" IS NOT NULL OR parent.status <> 'expired')) OR
      (NEW."type" <> 'expired' AND NEW."actorId" IS DISTINCT FROM parent."userId") OR
      (NEW."type" = 'created' AND parent.status <> 'pending_payment') OR
      (NEW."type" = 'cancelled' AND parent.status <> 'cancelled') OR
      (NEW."type" = 'contact_requested' AND (parent.status <> 'pending_payment' OR parent."contactRequestedAt" IS NULL)) THEN
      RAISE EXCEPTION 'payment_order_event_invalid' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER payment_order_write_guard BEFORE INSERT OR UPDATE OR DELETE ON payment_orders FOR EACH ROW EXECUTE FUNCTION guard_payment_order_write();
CREATE TRIGGER payment_order_item_write_guard BEFORE INSERT OR UPDATE OR DELETE ON payment_order_items FOR EACH ROW EXECUTE FUNCTION guard_payment_order_write();
CREATE TRIGGER payment_order_event_write_guard BEFORE INSERT OR UPDATE OR DELETE ON payment_order_events FOR EACH ROW EXECUTE FUNCTION guard_payment_order_write();

-- Deferred validation permits atomic order + items + event creation, never a partial order.
CREATE FUNCTION validate_payment_order_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target TEXT; parent payment_orders%ROWTYPE; item_count INTEGER; amount NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'payment_orders' THEN target := NEW.id; ELSE target := NEW."orderId"; END IF;
  SELECT * INTO parent FROM payment_orders WHERE id = target;
  SELECT count(*), sum(price) INTO item_count, amount FROM payment_order_items WHERE "orderId" = target;
  IF item_count <> parent."itemCount" OR amount IS DISTINCT FROM parent.total OR NOT EXISTS (
    SELECT 1 FROM payment_order_events WHERE "orderId" = target AND type = 'created'
  ) OR (parent.status = 'cancelled' AND NOT EXISTS (SELECT 1 FROM payment_order_events WHERE "orderId" = target AND type = 'cancelled'))
    OR (parent.status = 'expired' AND NOT EXISTS (SELECT 1 FROM payment_order_events WHERE "orderId" = target AND type = 'expired'))
    OR (parent."contactRequestedAt" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM payment_order_events WHERE "orderId" = target AND type = 'contact_requested')) THEN
    RAISE EXCEPTION 'payment_order_unbalanced_or_event_missing' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER payment_order_balance AFTER INSERT OR UPDATE ON payment_orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_payment_order_balance();
CREATE CONSTRAINT TRIGGER payment_order_item_balance AFTER INSERT ON payment_order_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_payment_order_balance();

COMMIT;
