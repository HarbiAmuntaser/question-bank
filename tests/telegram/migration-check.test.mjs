import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "prisma/migrations/20261007090000_telegram_access_core/migration.sql",
  "utf8",
);
const schema = readFileSync("prisma/schema.prisma", "utf8");

test("Telegram migration is transactional, additive and contains the five core stores", () => {
  assert.match(migration, /^BEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
  for (const table of [
    "telegram_subject_channels",
    "telegram_memberships",
    "telegram_link_tokens",
    "telegram_audit_events",
    "telegram_sync_jobs",
  ]) {
    assert.match(migration, new RegExp("CREATE TABLE " + table));
  }
  assert.doesNotMatch(
    migration,
    /ALTER TABLE (users|subjects|paid_access_plans|subscription_codes|access_entitlements|code_access_grants)\s+(ADD|DROP|ALTER)/i,
  );
  assert.doesNotMatch(migration, /\b(UPDATE|DELETE FROM)\s+(users|subjects|paid_access|subscription|access_|code_access)/i);
});

test("database constraints preserve principals, hashes, one active connect and immutable audit", () => {
  assert.match(migration, /telegram_memberships_principal_check/);
  assert.match(migration, /telegram_link_tokens_hash_format/);
  assert.match(migration, /telegram_link_tokens_activeKey_key/);
  assert.match(migration, /target_grant\."principalType" <> 'guest'/);
  assert.match(migration, /telegram_audit_immutable/);
  assert.match(migration, /telegram_link_token_transition_invalid/);
  assert.match(migration, /DEFAULT 'disconnected'/);
  assert.match(migration, /OLD\.state = NEW\.state[\s\S]*telegram_link_token_immutable_fields/);
  assert.match(migration, /"userSessionVersion" INTEGER/);
  assert.doesNotMatch(schema, /rawToken|botToken\s+String|inviteLink\s+String/);
});

test("MVP schema is subject-optional and channel-only without payment ownership changes", () => {
  assert.match(schema, /telegramChannel\s+TelegramSubjectChannel\?/);
  assert.match(schema, /subjectId\s+String\s+@unique/);
  assert.doesNotMatch(schema, /enum TelegramChatType[\s\S]*supergroup/);
  assert.match(schema, /codeAccessGrantId\s+String\?/);
  assert.match(schema, /userId\s+String\?/);
});
