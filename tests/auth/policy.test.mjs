import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { moduleLoader } from "../admin/load-module.mjs";
const load = moduleLoader();
const policy = load("src/lib/auth-policy.ts");
const schemas = load("src/validations/student-auth.ts");

test("callback accepts internal student paths and refuses redirect/parser bypasses", () => {
  assert.equal(policy.safeCallbackPath("/SA/universities/example?subject=x"), "/SA/universities/example?subject=x");
  for (const value of [undefined, "https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/%255c%255cevil.test", "/x/../admin", "/%61dmin/users", "/api/auth/signout", "/auth/signin", "/\nevil", "/%0aevil", "/%ZZ"]) {
    assert.equal(policy.safeCallbackPath(value), "/account", String(value));
  }
  assert.equal(policy.safeCallbackPath("/admin/users?page=2", "admin"), "/admin/users?page=2");
  assert.equal(policy.safeCallbackPath("/account", "admin"), "/admin");
  assert.equal(policy.safeAuthRedirect("https://evil.test", "https://mustawak.com"), "https://mustawak.com");
});
test("registration has strict fields, normalized emails and practical passwords", () => {
  const valid = { name: "Student", email: " Student@EXAMPLE.com ", password: "a long passphrase", confirmPassword: "a long passphrase" };
  assert.equal(schemas.registerSchema.parse(valid).email, "student@example.com");
  for (const field of ["role", "isActive", "emailVerified", "userId", "sessionVersion"]) assert.equal(schemas.registerSchema.safeParse({ ...valid, [field]: "admin" }).success, false);
  assert.equal(schemas.newPasswordSchema.safeParse("x".repeat(11)).success, false);
  assert.equal(schemas.newPasswordSchema.safeParse("x".repeat(64)).success, true);
  assert.equal(schemas.newPasswordSchema.safeParse("ع".repeat(37)).success, false);
  assert.equal(schemas.registerSchema.safeParse({ ...valid, confirmPassword: "different" }).success, false);
});
test("registration is fail-closed without flag or mail and does not activate with truthy strings", () => {
  const env = { NEXTAUTH_URL: "https://mustawak.com", NEXTAUTH_SECRET: "test", DATABASE_URL: "postgres://test", SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASSWORD: "p", AUTH_EMAIL_FROM: "test@example.com" };
  for (const flag of [undefined, "false", "1", "TRUE"]) {
    const config = moduleLoader({}, { process: { env: { ...env, STUDENT_REGISTRATION_ENABLED: flag } } })("src/lib/server/auth-config.ts");
    assert.equal(config.registrationConfigured(), false);
  }
  const configured = moduleLoader({}, { process: { env: { ...env, STUDENT_REGISTRATION_ENABLED: "true" } } })("src/lib/server/auth-config.ts");
  assert.equal(configured.registrationConfigured(), true);
  const missing = moduleLoader({}, { process: { env: { ...env, SMTP_PASSWORD: "", STUDENT_REGISTRATION_ENABLED: "true" } } })("src/lib/server/auth-config.ts");
  assert.equal(missing.registrationConfigured(), false);
});
test("R3 preserves pricing plans while removing only the retired request relation", () => {
  const old = execFileSync("git", ["show", "3d4ba6d:prisma/schema.prisma"], { encoding: "utf8" });
  const current = readFileSync("prisma/schema.prisma", "utf8");
  for (const model of ["PaidAccessPlan"]) {
    const pattern = new RegExp("model " + model + " \\{[\\s\\S]*?\\n\\}");
    // P4/R2 relations and R3's retired manual-request relation are the only allowed shape changes.
    const normalize = (value) => value.replaceAll("\r", "").replace(/^\s*orderItems\s+PaymentOrderItem\[\]\n/m, "").replace(/^\s*adminEvents\s+PaymentAdminEvent\[\]\n/m, "").replace(/^\s*paymentRequests\s+ManualPaymentRequest\[\]\n/m, "");
    assert.equal(normalize(current.match(pattern)[0]), normalize(old.match(pattern)[0]));
  }
});

test("IP identity never trusts an unconfigured or multi-hop proxy header", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.9", "x-verified-client-ip": "203.0.113.7" });
  function identity(header) {
    return moduleLoader({ "@/lib/prisma": { prisma: {} } }, { process: { env: { AUTH_TRUSTED_IP_HEADER: header } } })("src/lib/server/auth-rate-limit.ts").requestIdentity(headers);
  }
  assert.equal(identity(undefined), "shared");
  assert.equal(identity("x-verified-client-ip"), "203.0.113.7");
  headers.set("x-verified-client-ip", "203.0.113.7, 203.0.113.9");
  assert.equal(identity("x-verified-client-ip"), "shared");
});

test("admin guards independently reject revoked and versionless sessions", async () => {
  for (const version of [undefined, 0, 1]) {
    const loadGuard = moduleLoader({
      "next-auth": { getServerSession: async () => ({ user: { id: "admin", role: "admin", sessionVersion: version } }) },
      "@/lib/auth": { authOptions: {} },
      "@/lib/prisma": { prisma: { user: { findUnique: async () => ({ id: "admin", role: "admin", isActive: true, sessionVersion: 1 }) } } },
    });
    assert.equal((await loadGuard("src/lib/admin-auth.ts").getAdminAccess("users:manage")).ok, version === 1);
  }
});
