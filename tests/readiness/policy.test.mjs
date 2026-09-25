import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateClosedReadiness } from "../../scripts/production-readiness.mjs";
import { compactYarnAuditReport, parseYarnAudit } from "../../scripts/dependency-audit-report.mjs";
import { moduleLoader } from "../admin/load-module.mjs";

const accountId = "a".repeat(32);
const readyEnv = {
  NODE_ENV: "production",
  STUDENT_REGISTRATION_ENABLED: "false",
  GOOGLE_AUTH_ENABLED: "false",
  PAYMENT_V1_ENABLED: "false",
  PAYMENT_REVIEW_ENABLED: "false",
  PAYMENT_CODES_ENABLED: "false",
  PAYMENT_LAUNCH_PLAN_IDS: "[]",
  PAYMENT_CODE_PLAN_IDS: "[]",
  NEXTAUTH_URL: "https://mustawak.example",
  NEXTAUTH_SECRET: "r4-test-secret-with-more-than-32-characters",
  DATABASE_URL: "postgresql://app:password@ep-r4-pooler.us-east-2.aws.neon.tech/app?sslmode=require",
  DIRECT_URL: "postgresql://migrator:password@ep-r4.us-east-2.aws.neon.tech/app?sslmode=require",
  SMTP_HOST: "smtp.example",
  SMTP_PORT: "587",
  SMTP_USER: "mailer",
  SMTP_PASSWORD: "mail-password",
  AUTH_EMAIL_FROM: "Mustawak <no-reply@mustawak.example>",
  AUTH_TRUSTED_IP_HEADER: "",
  VERCEL_ENV: "production",
  R2_ACCOUNT_ID: accountId,
  R2_ACCESS_KEY_ID: "access-key",
  R2_SECRET_ACCESS_KEY: "secret-key",
  R2_ENDPOINT: `https://${accountId}.r2.cloudflarestorage.com`,
  R2_PUBLIC_BUCKET: "mustawak-public",
  R2_PRIVATE_BUCKET: "mustawak-private",
  R2_PUBLIC_BASE_URL: "https://cdn.mustawak.example",
  R2_SIGNED_URL_TTL_SECONDS: "300",
};

test("closed-state production preflight passes synthetic configuration without exposing values", () => {
  const report = evaluateClosedReadiness(readyEnv);
  assert.equal(report.automatedReady, true);
  assert.equal(report.externalVerificationRequired, true);
  assert.ok(report.manualGates.every((gate) => gate.status === "pending"));
  const serialized = JSON.stringify(report);
  for (const secret of [readyEnv.NEXTAUTH_SECRET, readyEnv.DATABASE_URL, readyEnv.SMTP_PASSWORD, readyEnv.R2_SECRET_ACCESS_KEY]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("preflight fails closed for launch flags, unsafe origins, shared databases, R2 or proxy assumptions", () => {
  const report = evaluateClosedReadiness({
    ...readyEnv,
    PAYMENT_V1_ENABLED: "TRUE",
    GOOGLE_AUTH_ENABLED: "true",
    PAYMENT_LAUNCH_PLAN_IDS: '["plan"]',
    PAYMENT_CODE_PLAN_IDS: '["plan"]',
    NEXTAUTH_URL: "http://mustawak.example/path",
    DIRECT_URL: readyEnv.DATABASE_URL,
    R2_PRIVATE_BUCKET: readyEnv.R2_PUBLIC_BUCKET,
    R2_SIGNED_URL_TTL_SECONDS: "3600",
    AUTH_TRUSTED_IP_HEADER: "x-forwarded-for",
  });
  assert.equal(report.automatedReady, false);
  const failures = report.checks.filter((check) => check.status === "fail").map((check) => check.id);
  for (const id of ["closed_google_auth_enabled", "google_oauth_configuration", "closed_payment_v1_enabled", "closed_launch_plan_ids", "closed_code_plan_ids", "https_auth_origin", "database_connection_separation", "neon_pooling", "r2_bucket_separation", "r2_signed_url_ttl", "trusted_ip_header"]) {
    assert.ok(failures.includes(id), id);
  }
});

test("runtime R2 config enforces HTTPS, separate buckets and short signed URLs", () => {
  const load = (env) => moduleLoader({}, { process: { env } })("src/lib/server/storage/config.ts");
  const valid = load(readyEnv).getR2StorageConfig();
  assert.equal(valid.signedUrlTtlSeconds, 300);
  for (const env of [
    { ...readyEnv, R2_PRIVATE_BUCKET: readyEnv.R2_PUBLIC_BUCKET },
    { ...readyEnv, R2_ENDPOINT: `http://${accountId}.r2.cloudflarestorage.com` },
    { ...readyEnv, R2_ENDPOINT: `https://${"b".repeat(32)}.r2.cloudflarestorage.com` },
    { ...readyEnv, R2_SIGNED_URL_TTL_SECONDS: "901" },
  ]) assert.throws(() => load(env).getR2StorageConfig(), /R2|bucket|HTTPS|between/i);
});

test("read-only Yarn audit parser deduplicates advisories and retains summary", () => {
  const advisory = { id: 7, module_name: "next", severity: "critical", patched_versions: ">=1", recommendation: "upgrade", findings: [{ version: "0", paths: ["next"] }] };
  const output = [
    JSON.stringify({ type: "auditAdvisory", data: { advisory } }),
    JSON.stringify({ type: "auditAdvisory", data: { advisory } }),
    JSON.stringify({ type: "auditSummary", data: { vulnerabilities: { critical: 1 }, dependencies: 1 } }),
  ].join("\n");
  const report = parseYarnAudit(output);
  assert.equal(report.uniqueAdvisoryCount, 1);
  assert.equal(report.advisories[0].direct, true);
  assert.equal(report.summary.vulnerabilities.critical, 1);
  const compact = compactYarnAuditReport(report);
  assert.deepEqual(compact.affectedPackageGroups[0].advisoryIds, [7]);
  assert.equal(compact.affectedPackageGroups[0].advisoryCount, 1);
});

test("R4 package commands remain read-only and keep every release switch closed by example", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.scripts["security:audit:read-only"], "node scripts/dependency-audit-report.mjs");
  assert.doesNotMatch(pkg.scripts["security:audit:read-only"], /fix|install|upgrade/i);
  const example = readFileSync(".env.example", "utf8");
  for (const key of ["STUDENT_REGISTRATION_ENABLED", "GOOGLE_AUTH_ENABLED", "PAYMENT_V1_ENABLED", "PAYMENT_REVIEW_ENABLED", "PAYMENT_CODES_ENABLED"]) {
    assert.match(example, new RegExp(`^${key}=false$`, "m"));
  }
  assert.match(example, /^PAYMENT_LAUNCH_PLAN_IDS=\[\]$/m);
  assert.match(example, /^PAYMENT_CODE_PLAN_IDS=\[\]$/m);
});
