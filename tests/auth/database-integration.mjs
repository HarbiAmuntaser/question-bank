import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { moduleLoader } from "../admin/load-module.mjs";

const url = new URL(process.env.P2_TEST_DATABASE_URL ?? "");
assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.pathname, "/p2_test");
const prisma = new PrismaClient({ datasourceUrl: url.href });
const second = new PrismaClient({ datasourceUrl: url.href });
const load = moduleLoader({ "@/lib/prisma": { prisma } });
const accounts = load("src/lib/server/student-accounts.ts");
const auth = load("src/lib/auth.ts").authOptions;
const adminUsers = load("src/lib/server/admin-users.ts");
const limiter = load("src/lib/server/auth-rate-limit.ts");
const limiter2 = moduleLoader({ "@/lib/prisma": { prisma: second } })("src/lib/server/auth-rate-limit.ts");
const { hashPassword, comparePassword } = load("src/lib/server/auth-password.ts");
const password = "A memorable student phrase";
function rawToken(address, path) {
  const messages = JSON.parse(readFileSync(process.env.P2_TEST_MAILBOX, "utf8"));
  const message = messages.filter((m) => m.to.includes(address) && m.text.includes(path)).at(-1);
  assert.ok(message, "local SMTP delivered a message");
  const match = message.text.match(/token=([A-Za-z0-9_-]{43})/);
  assert.ok(match); return match[1];
}
function provider(portal) { return auth.providers.find((p) => p.options.id === `${portal}-credentials`).options; }
const login = (portal, email, pass = password) => provider(portal).authorize({ email, password: pass }, { headers: {} });
let count = 0;
async function check(name, work) { await work(); console.log(`PASS ${++count}: ${name}`); }
try {
  await check("TLS email registration, explicit student role, no plaintext token or password", async () => {
    await accounts.registerStudent({ name: "Test Student", email: "student@example.test", password, callbackUrl: "/SA/universities" });
    const user = await prisma.user.findUnique({ where: { normalizedEmail: "student@example.test" } });
    assert.equal(user.role, "student"); assert.equal(user.emailVerified, null); assert.notEqual(user.password, password);
    assert.equal(await comparePassword(password, user.password), true);
    const raw = rawToken(user.email, "verify-email");
    const token = await prisma.userAuthToken.findFirst({ where: { userId: user.id } });
    assert.equal(token.tokenHash, createHash("sha256").update(raw).digest("hex"));
    assert.equal(await login("student", user.email), null);
  });
  await check("wrong password cannot activate a pre-registered account; token consumers are atomic", async () => {
    const raw = rawToken("student@example.test", "verify-email");
    await assert.rejects(accounts.consumeStudentToken(raw, "verify_email", "wrong"), /invalid_or_expired_token/);
    const outcomes = await Promise.allSettled([accounts.consumeStudentToken(raw, "verify_email", password), accounts.consumeStudentToken(raw, "verify_email", password)]);
    assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal(outcomes.find((x) => x.status === "fulfilled").value, "/SA/universities");
    await assert.rejects(accounts.consumeStudentToken(raw, "verify_email", password), /invalid_or_expired_token/);
  });
  let session;
  await check("student/admin credential isolation, normalized login and verified student session", async () => {
    session = await login("student", " STUDENT@EXAMPLE.TEST "); assert.ok(session);
    assert.equal(await login("admin", "student@example.test"), null);
    await prisma.user.update({ where: { id: "legacy-admin" }, data: { password: await hashPassword(password) } });
    assert.equal(await login("student", "legacy.admin@example.test"), null);
    assert.ok(await login("admin", "legacy.admin@example.test"));
    assert.equal(auth.session.maxAge, 30 * 86400);
  });
  await check("Google OAuth creates only a verified normalized student and persists no provider tokens", async () => {
    const google = auth.providers.find((candidate) => candidate.id === "google");
    assert.ok(google);
    assert.equal(google.options.authorization.params.scope, "openid email");
    assert.equal(google.options.allowDangerousEmailAccountLinking, undefined);
    assert.throws(() => google.options.profile({ sub: "bad-google", email: "bad@example.test", email_verified: false }), /google_profile_not_verified/);
    const profile = google.options.profile({ sub: "google-student-sub", email: " Google.Student@Example.test ", email_verified: true });
    const oauthUser = await auth.adapter.createUser(profile);
    assert.equal(oauthUser.normalizedEmail, "google.student@example.test");
    assert.equal(oauthUser.password, null);
    assert.equal(oauthUser.role, "student");
    assert.equal(oauthUser.sessionVersion, 0);
    assert.ok(oauthUser.emailVerified);
    await auth.adapter.linkAccount({ userId: oauthUser.id, type: "oauth", provider: "google", providerAccountId: "google-student-sub",
      access_token: "not-persisted", refresh_token: "not-persisted", id_token: "not-persisted", expires_at: 9999999999 });
    const stored = await prisma.account.findUniqueOrThrow({ where: { provider_providerAccountId: { provider: "google", providerAccountId: "google-student-sub" } } });
    for (const field of ["access_token", "refresh_token", "id_token", "expires_at", "scope", "token_type", "session_state"]) assert.equal(stored[field], null);
    await assert.rejects(auth.adapter.linkAccount({ userId: oauthUser.id, type: "oauth", provider: "google", providerAccountId: "second-google-sub" }), /google_account_link_not_allowed/);
    assert.equal(await prisma.account.count({ where: { userId: oauthUser.id } }), 1);
    assert.equal(await login("student", oauthUser.email, "any password remains invalid"), null);
    const oauthJwt = await auth.callbacks.jwt({ token: {}, user: oauthUser, account: stored, profile, trigger: "signUp", isNewUser: true });
    assert.equal(oauthJwt.role, "student"); assert.equal(oauthJwt.sessionVersion, 0); assert.ok(oauthJwt.emailVerified);
    process.env.STUDENT_REGISTRATION_ENABLED = "false";
    assert.equal(await auth.callbacks.signIn({ user: oauthUser, account: { provider: "google", providerAccountId: "google-student-sub" }, profile: { ...profile, email_verified: true } }), true);
    assert.equal(await auth.callbacks.signIn({ user: profile, account: { provider: "google", providerAccountId: "new-google-sub" }, profile: { ...profile, sub: "new-google-sub", email: "new-google@example.test", email_verified: true } }), false);
    process.env.STUDENT_REGISTRATION_ENABLED = "true";
    const credentialsUser = await prisma.user.findUniqueOrThrow({ where: { normalizedEmail: "student@example.test" } });
    assert.equal(await auth.callbacks.signIn({ user: profile, account: { provider: "google", providerAccountId: "collision-sub" }, profile: { ...profile, email: credentialsUser.email, email_verified: true } }), true);
    assert.equal((await auth.adapter.getUserByEmail(" STUDENT@EXAMPLE.TEST ")).id, credentialsUser.id);
    assert.equal(await prisma.account.count({ where: { providerAccountId: "collision-sub" } }), 0);
  });
  let jwt;
  await check("JWT ignores client session updates and rejects versionless legacy cookies", async () => {
    jwt = await auth.callbacks.jwt({ token: {}, user: session });
    const refreshed = await auth.callbacks.jwt({ token: jwt, trigger: "update", session: { role: "admin", sessionVersion: 999 } });
    assert.equal(refreshed.role, "student"); assert.equal(refreshed.sessionVersion, jwt.sessionVersion);
    assert.deepEqual(await auth.callbacks.jwt({ token: { sub: session.id, role: "admin" } }), {});
  });
  await check("reset changes only password/verification/version, consumes tokens and revokes all old sessions", async () => {
    await accounts.requestStudentEmail("student@example.test", "reset_password", "//evil.test");
    const raw = rawToken("student@example.test", "reset-password");
    assert.equal(await accounts.consumeStudentToken(raw, "reset_password", "new safe student phrase"), "/account");
    assert.deepEqual(await auth.callbacks.jwt({ token: jwt }), {});
    assert.equal(await login("student", "student@example.test"), null);
    assert.ok(await login("student", "student@example.test", "new safe student phrase"));
    await assert.rejects(accounts.consumeStudentToken(raw, "reset_password", password));
  });
  await check("administrative roles cannot be registered or reset through student services", async () => {
    const before = await prisma.user.findUnique({ where: { id: "legacy-admin" } });
    await accounts.registerStudent({ name: "Intruder", email: before.normalizedEmail, password: "attacker phrase 123" });
    await accounts.requestStudentEmail(before.normalizedEmail, "reset_password");
    assert.deepEqual(await prisma.user.findUnique({ where: { id: before.id } }), before);
    assert.equal(await prisma.userAuthToken.count({ where: { userId: before.id } }), 0);
  });
  await check("concurrent duplicate registrations retain one account and its original credentials", async () => {
    await Promise.all([1, 2].map(() => accounts.registerStudent({ name: "Concurrent", email: "race@example.test", password })));
    assert.equal(await prisma.user.count({ where: { normalizedEmail: "race@example.test" } }), 1);
    await accounts.registerStudent({ name: "Replacement", email: "race@example.test", password: "replacement password" });
    const user = await prisma.user.findUnique({ where: { normalizedEmail: "race@example.test" } });
    assert.equal(user.name, "Concurrent"); assert.equal(await comparePassword(password, user.password), true);
  });
  await check("distributed rate limit is atomic across two independent Prisma connections", async () => {
    const outcomes = await Promise.allSettled(Array.from({ length: 24 }, (_, i) => (i % 2 ? limiter : limiter2).consumeAuthLimit("concurrency", "same-account", 5, 900)));
    assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 5);
    assert.equal(outcomes.filter((r) => r.status === "rejected" && r.reason.message === "too_many_requests").length, 19);
  });
  await check("admin disable/enable and password/email/role changes invalidate old JWTs and tokens", async () => {
    const currentSession = await login("student", "student@example.test", "new safe student phrase");
    const old = await auth.callbacks.jwt({ token: {}, user: currentSession });
    await adminUsers.updateManagedUser("legacy-admin", session.id, { isActive: false });
    assert.deepEqual(await auth.callbacks.jwt({ token: old }), {});
    await adminUsers.updateManagedUser("legacy-admin", session.id, { isActive: true });
    assert.deepEqual(await auth.callbacks.jwt({ token: old }), {});
    await accounts.requestStudentEmail("student@example.test", "reset_password");
    const raw = rawToken("student@example.test", "reset-password");
    await adminUsers.updateManagedUser("legacy-admin", session.id, { email: "changed@example.test" });
    await assert.rejects(accounts.consumeStudentToken(raw, "reset_password", password));
    const changed = await prisma.user.findUnique({ where: { id: session.id } });
    assert.equal(changed.normalizedEmail, "changed@example.test"); assert.equal(changed.emailVerified, null);
    await assert.rejects(adminUsers.updateManagedUser("legacy-admin", "legacy-admin", { role: "student" }), /last_active_admin/);
  });
  await check("expired and wrong-purpose tokens fail without side effects", async () => {
    const raw = rawToken("race@example.test", "verify-email");
    await assert.rejects(accounts.consumeStudentToken(raw, "reset_password", password));
    await prisma.userAuthToken.updateMany({ where: { tokenHash: createHash("sha256").update(raw).digest("hex") }, data: { expiresAt: new Date(0) } });
    await assert.rejects(accounts.consumeStudentToken(raw, "verify_email", password));
  });
  await prisma.authRateLimit.deleteMany();
  console.log(`${count} PostgreSQL/service acceptance checks passed`);
} finally { await prisma.$disconnect(); await second.$disconnect(); }
