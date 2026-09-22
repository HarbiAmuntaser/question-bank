BEGIN;

-- R3 intentionally removes only pre-v1 payment rows. Never discard an audited or
-- financial record implicitly: an operator must investigate those first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM payment_admin_events e
    JOIN access_entitlements a ON a.id = e."entitlementId"
    WHERE a."userId" IS NULL OR a."anonymousSessionId" IS NOT NULL
      OR a."scopeType" <> 'subject' OR a."subjectId" IS NULL OR a."majorId" IS NOT NULL
  ) THEN RAISE EXCEPTION 'payment_r3_legacy_entitlement_has_audit' USING ERRCODE = '23514'; END IF;

  IF EXISTS (
    SELECT 1 FROM payment_admin_events e
    JOIN subscription_codes c ON c.id = e."codeId"
    WHERE c."paymentVersion" <> 1
  ) THEN RAISE EXCEPTION 'payment_r3_legacy_code_has_audit' USING ERRCODE = '23514'; END IF;

  IF EXISTS (
    SELECT 1 FROM payment_order_items i
    JOIN paid_access_plans p ON p.id = i."planId"
    LEFT JOIN subjects s ON s.id = p."subjectId"
    LEFT JOIN majors m ON m.id = s."majorId"
    LEFT JOIN universities u ON u.id = m."universityId"
    WHERE p."scopeType" <> 'subject' OR p."majorId" IS NOT NULL OR p."subjectId" IS NULL
      OR u."countryCode" IS DISTINCT FROM 'SA' OR u."institutionType" IS DISTINCT FROM 'university'
  ) THEN RAISE EXCEPTION 'payment_r3_legacy_plan_has_financial_history' USING ERRCODE = '23514'; END IF;

  IF EXISTS (
    SELECT 1 FROM payment_admin_events e
    JOIN paid_access_plans p ON p.id = e."planId"
    LEFT JOIN subjects s ON s.id = p."subjectId"
    LEFT JOIN majors m ON m.id = s."majorId"
    LEFT JOIN universities u ON u.id = m."universityId"
    WHERE p."scopeType" <> 'subject' OR p."majorId" IS NOT NULL OR p."subjectId" IS NULL
      OR u."countryCode" IS DISTINCT FROM 'SA' OR u."institutionType" IS DISTINCT FROM 'university'
  ) THEN RAISE EXCEPTION 'payment_r3_legacy_plan_has_audit' USING ERRCODE = '23514'; END IF;

  -- A paid summary cannot retain a public PDF or direct public media reference.
  IF EXISTS (
    SELECT 1
    FROM study_summaries summary
    JOIN subjects s ON s.id = summary."subjectId"
    JOIN majors m ON m.id = s."majorId"
    JOIN universities u ON u.id = m."universityId"
    LEFT JOIN attachments a ON a.id = summary."pdfAttachmentId"
    WHERE u."countryCode" = 'SA' AND u."institutionType" = 'university'
      AND (
        summary."accessType" = 'paid'
        OR (summary."accessType" = 'inherit' AND EXISTS (
          SELECT 1 FROM paid_access_plans p
          WHERE p."subjectId" = summary."subjectId" AND p."isActive"
            AND p."scopeType" = 'subject' AND p."majorId" IS NULL
        ))
      )
      AND (
        (summary."pdfAttachmentId" IS NOT NULL AND (
          a.id IS NULL OR a."storageProvider" <> 'r2' OR a.visibility <> 'private'
          OR a.bucket IS NULL OR a."storageKey" IS NULL
        ))
        OR COALESCE(summary."contentHtml", '') ~* $media$(https?://|/uploads/attachments/)[^[:space:]"'<>]+\.(pdf|docx?|pptx?|xlsx?|zip|mp4|mp3|webm)([?#][^[:space:]"'<>]*)?$media$
        OR COALESCE(summary."contentText", '') ~* $media$(https?://|/uploads/attachments/)[^[:space:]"'<>]+\.(pdf|docx?|pptx?|xlsx?|zip|mp4|mp3|webm)([?#][^[:space:]"'<>]*)?$media$
      )
  ) THEN RAISE EXCEPTION 'payment_r3_private_media_required' USING ERRCODE = '23514'; END IF;
END;
$$;

-- Drop triggers before removing their legacy columns, then recreate the v1-only guard.
DROP TRIGGER IF EXISTS payment_plan_scope_guard ON paid_access_plans;
DROP TRIGGER IF EXISTS payment_code_scope_guard ON subscription_codes;
DROP TRIGGER IF EXISTS payment_entitlement_owner_guard ON access_entitlements;
DROP TRIGGER IF EXISTS payment_request_owner_guard ON manual_payment_requests;

DELETE FROM access_entitlements a
USING subscription_codes c
LEFT JOIN paid_access_plans p ON p.id = c."planId"
LEFT JOIN subjects s ON s.id = p."subjectId"
LEFT JOIN majors m ON m.id = s."majorId"
LEFT JOIN universities u ON u.id = m."universityId"
WHERE a."codeId" = c.id
  AND (c."paymentVersion" <> 1 OR p."scopeType" <> 'subject' OR p."majorId" IS NOT NULL OR p."subjectId" IS NULL
    OR u."countryCode" IS DISTINCT FROM 'SA' OR u."institutionType" IS DISTINCT FROM 'university');
DELETE FROM access_entitlements
WHERE "userId" IS NULL OR "anonymousSessionId" IS NOT NULL OR "scopeType" <> 'subject' OR "subjectId" IS NULL OR "majorId" IS NOT NULL;

DELETE FROM subscription_codes c
USING paid_access_plans p
LEFT JOIN subjects s ON s.id = p."subjectId"
LEFT JOIN majors m ON m.id = s."majorId"
LEFT JOIN universities u ON u.id = m."universityId"
WHERE c."planId" = p.id
  AND (c."paymentVersion" <> 1 OR p."scopeType" <> 'subject' OR p."majorId" IS NOT NULL OR p."subjectId" IS NULL
    OR u."countryCode" IS DISTINCT FROM 'SA' OR u."institutionType" IS DISTINCT FROM 'university');
DELETE FROM paid_access_plans p
USING subjects s
LEFT JOIN majors m ON m.id = s."majorId"
LEFT JOIN universities u ON u.id = m."universityId"
WHERE p."subjectId" = s.id
  AND (p."scopeType" <> 'subject' OR p."majorId" IS NOT NULL
    OR u."countryCode" IS DISTINCT FROM 'SA' OR u."institutionType" IS DISTINCT FROM 'university');
DELETE FROM paid_access_plans WHERE "scopeType" <> 'subject' OR "majorId" IS NOT NULL OR "subjectId" IS NULL;

DROP TABLE manual_payment_requests;
DROP TYPE "ManualPaymentStatus";

ALTER TABLE access_entitlements DROP COLUMN "anonymousSessionId", DROP COLUMN "majorId";
ALTER TABLE access_entitlements ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE access_entitlements ALTER COLUMN "subjectId" SET NOT NULL;
ALTER TABLE subscription_codes DROP COLUMN "paymentVersion";

CREATE OR REPLACE FUNCTION payment_subject_has_unsafe_summary_media(target_subject TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM study_summaries summary
    LEFT JOIN attachments a ON a.id = summary."pdfAttachmentId"
    WHERE summary."subjectId" = target_subject AND summary."accessType" <> 'free'
      AND (
        (summary."pdfAttachmentId" IS NOT NULL AND (
          a.id IS NULL OR a."storageProvider" <> 'r2' OR a.visibility <> 'private'
          OR a.bucket IS NULL OR a."storageKey" IS NULL
        ))
        OR COALESCE(summary."contentHtml", '') ~* $media$(https?://|/uploads/attachments/)[^[:space:]"'<>]+\.(pdf|docx?|pptx?|xlsx?|zip|mp4|mp3|webm)([?#][^[:space:]"'<>]*)?$media$
        OR COALESCE(summary."contentText", '') ~* $media$(https?://|/uploads/attachments/)[^[:space:]"'<>]+\.(pdf|docx?|pptx?|xlsx?|zip|mp4|mp3|webm)([?#][^[:space:]"'<>]*)?$media$
      )
  );
$$;

CREATE OR REPLACE FUNCTION guard_payment_v1_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  valid_plan BOOLEAN;
  target_plan_id TEXT;
  entitlement_code_id TEXT;
  entitlement_subject_id TEXT;
  entitlement_user_id TEXT;
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
    IF NEW."isActive" AND payment_subject_has_unsafe_summary_media(NEW."subjectId") THEN
      RAISE EXCEPTION 'payment_private_media_required' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'subscription_codes' THEN
    target_plan_id := NEW."planId";
    IF TG_OP = 'UPDATE' THEN
      IF NEW."planId" IS DISTINCT FROM OLD."planId" THEN
        RAISE EXCEPTION 'payment_target_immutable' USING ERRCODE = '23514';
      END IF;
      IF NOT NEW."isActive" AND (to_jsonb(NEW) - 'isActive' - 'updatedAt') = (to_jsonb(OLD) - 'isActive' - 'updatedAt') THEN RETURN NEW; END IF;
    END IF;
    SELECT p."isActive" AND p."scopeType" = 'subject' AND p."majorId" IS NULL AND payment_v1_subject_allowed(p."subjectId")
      INTO valid_plan FROM paid_access_plans p WHERE p.id = target_plan_id;
    IF NOT coalesce(valid_plan, false) THEN
      RAISE EXCEPTION 'payment_scope_not_allowed' USING ERRCODE = '23514';
    END IF;
    IF NEW."maxUses" < 1 OR NEW."usedCount" < 0 OR NEW."usedCount" > NEW."maxUses" OR
      (NEW."durationDays" IS NOT NULL AND NEW."durationDays" < 1) OR
      (NEW."startsAt" IS NOT NULL AND NEW."expiresAt" IS NOT NULL AND NEW."startsAt" >= NEW."expiresAt") THEN
      RAISE EXCEPTION 'invalid_payment_code_window' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'access_entitlements' THEN
    entitlement_code_id := NEW."codeId";
    entitlement_subject_id := NEW."subjectId";
    entitlement_user_id := NEW."userId";
    IF TG_OP = 'UPDATE' THEN
      IF (NEW."userId", NEW."scopeType", NEW."subjectId", NEW."codeId") IS DISTINCT FROM
        (OLD."userId", OLD."scopeType", OLD."subjectId", OLD."codeId") THEN
        RAISE EXCEPTION 'payment_ownership_immutable' USING ERRCODE = '23514';
      END IF;
      IF NOT NEW."isActive" AND (to_jsonb(NEW) - 'isActive' - 'updatedAt') = (to_jsonb(OLD) - 'isActive' - 'updatedAt') THEN RETURN NEW; END IF;
    END IF;
    IF NEW."scopeType" <> 'subject' OR NOT payment_v1_subject_allowed(entitlement_subject_id) THEN
      RAISE EXCEPTION 'payment_owner_or_scope_invalid' USING ERRCODE = '23514';
    END IF;
    IF NEW."expiresAt" IS NOT NULL AND NEW."expiresAt" <= NEW."startsAt" THEN
      RAISE EXCEPTION 'invalid_entitlement_window' USING ERRCODE = '23514';
    END IF;
    IF entitlement_code_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM subscription_codes c JOIN paid_access_plans p ON p.id = c."planId"
      WHERE c.id = entitlement_code_id AND p."scopeType" = 'subject' AND p."subjectId" = entitlement_subject_id AND p."majorId" IS NULL
    ) THEN RAISE EXCEPTION 'entitlement_code_scope_mismatch' USING ERRCODE = '23514'; END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = entitlement_user_id AND role = 'student' AND "isActive" AND "emailVerified" IS NOT NULL) THEN
      RAISE EXCEPTION 'payment_student_required' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- R3 removes anonymous and major ownership from grants, so refresh the P5 order grant guard
-- against the final entitlement shape while preserving approval-time safeguards.
CREATE OR REPLACE FUNCTION guard_order_entitlement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  item payment_order_items%ROWTYPE;
  parent payment_orders%ROWTYPE;
  target_order_item_id TEXT;
  target_user_id TEXT;
  target_subject_id TEXT;
  target_code_id TEXT;
  target_starts_at TIMESTAMPTZ;
  target_expires_at TIMESTAMPTZ;
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
    PERFORM id FROM users WHERE id = NEW."userId" FOR UPDATE;
    PERFORM lock_payment_account(NEW."userId");
    RETURN NEW;
  END IF;

  target_order_item_id := NEW."orderItemId";
  target_user_id := NEW."userId";
  target_subject_id := NEW."subjectId";
  target_code_id := NEW."codeId";
  target_starts_at := NEW."startsAt";
  target_expires_at := NEW."expiresAt";
  PERFORM id FROM users WHERE id = target_user_id FOR UPDATE;
  PERFORM lock_payment_account(target_user_id);
  IF target_order_item_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO item FROM payment_order_items WHERE id = target_order_item_id;
  SELECT * INTO parent FROM payment_orders WHERE id = item."orderId";
  IF item.id IS NULL OR parent.status <> 'approved' OR target_user_id IS DISTINCT FROM parent."userId" OR
    target_subject_id IS DISTINCT FROM item."subjectId" OR target_code_id IS NOT NULL OR NOT NEW."isActive" OR
    NEW."scopeType" <> 'subject' OR NOT payment_v1_subject_allowed(item."subjectId") OR
    target_starts_at IS DISTINCT FROM (SELECT "createdAt" AT TIME ZONE 'UTC' FROM payment_review_events WHERE "orderId" = parent.id AND version = parent."reviewVersion" AND action = 'approved') OR
    (item."durationDays" IS NULL AND target_expires_at IS NOT NULL) OR
    (item."durationDays" IS NOT NULL AND target_expires_at IS DISTINCT FROM target_starts_at + item."durationDays" * interval '24 hours') OR
    EXISTS (SELECT 1 FROM access_entitlements WHERE "userId" = target_user_id AND "subjectId" = target_subject_id AND "scopeType" = 'subject' AND "isActive"
      AND ("expiresAt" IS NULL OR "expiresAt" > target_starts_at)) THEN
    RAISE EXCEPTION 'payment_grant_conflict' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION guard_payment_summary_media() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE requires_private BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'attachments' THEN
    IF EXISTS (
      SELECT 1 FROM study_summaries summary
      WHERE summary."pdfAttachmentId" = NEW.id
        AND payment_v1_subject_allowed(summary."subjectId")
        AND (summary."accessType" = 'paid' OR (summary."accessType" = 'inherit' AND EXISTS (
          SELECT 1 FROM paid_access_plans p WHERE p."subjectId" = summary."subjectId" AND p."isActive"
            AND p."scopeType" = 'subject' AND p."majorId" IS NULL
        )))
        AND (NEW."storageProvider" <> 'r2' OR NEW.visibility <> 'private' OR NEW.bucket IS NULL OR NEW."storageKey" IS NULL)
    ) THEN RAISE EXCEPTION 'payment_private_media_required' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
  END IF;

  requires_private := payment_v1_subject_allowed(NEW."subjectId") AND (
    NEW."accessType" = 'paid' OR (NEW."accessType" = 'inherit' AND EXISTS (
      SELECT 1 FROM paid_access_plans p WHERE p."subjectId" = NEW."subjectId" AND p."isActive"
        AND p."scopeType" = 'subject' AND p."majorId" IS NULL
    ))
  );
  IF requires_private AND (
    (NEW."pdfAttachmentId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM attachments a WHERE a.id = NEW."pdfAttachmentId" AND a."storageProvider" = 'r2'
        AND a.visibility = 'private' AND a.bucket IS NOT NULL AND a."storageKey" IS NOT NULL
    ))
    OR COALESCE(NEW."contentHtml", '') ~* $media$(https?://|/uploads/attachments/)[^[:space:]"'<>]+\.(pdf|docx?|pptx?|xlsx?|zip|mp4|mp3|webm)([?#][^[:space:]"'<>]*)?$media$
    OR COALESCE(NEW."contentText", '') ~* $media$(https?://|/uploads/attachments/)[^[:space:]"'<>]+\.(pdf|docx?|pptx?|xlsx?|zip|mp4|mp3|webm)([?#][^[:space:]"'<>]*)?$media$
  ) THEN RAISE EXCEPTION 'payment_private_media_required' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_plan_scope_guard BEFORE INSERT OR UPDATE ON paid_access_plans FOR EACH ROW EXECUTE FUNCTION guard_payment_v1_write();
CREATE TRIGGER payment_code_scope_guard BEFORE INSERT OR UPDATE ON subscription_codes FOR EACH ROW EXECUTE FUNCTION guard_payment_v1_write();
CREATE TRIGGER payment_entitlement_owner_guard BEFORE INSERT OR UPDATE ON access_entitlements FOR EACH ROW EXECUTE FUNCTION guard_payment_v1_write();
CREATE TRIGGER payment_summary_media_guard BEFORE INSERT OR UPDATE ON study_summaries FOR EACH ROW EXECUTE FUNCTION guard_payment_summary_media();
CREATE TRIGGER payment_attachment_media_guard BEFORE UPDATE OF "storageProvider", visibility, bucket, "storageKey" ON attachments FOR EACH ROW EXECUTE FUNCTION guard_payment_summary_media();

COMMIT;
