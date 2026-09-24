import test from "node:test";
import assert from "node:assert/strict";

import { moduleLoader } from "../admin/load-module.mjs";

function harness({ registration = true } = {}) {
  const users = new Map();
  const accounts = new Map();
  let nextUser = 1;
  let nextAccount = 1;
  const select = (row, fields) => fields
    ? Object.fromEntries(Object.keys(fields).filter((key) => fields[key] === true).map((key) => [key, row[key]]))
    : row;
  const prisma = {
    user: {
      async create({ data }) {
        if ([...users.values()].some((user) => user.normalizedEmail === data.normalizedEmail)) throw new Error("duplicate_email");
        const row = { id: `u${nextUser++}`, createdAt: new Date(), ...data };
        users.set(row.id, row);
        return row;
      },
      async findUnique({ where, select: fields }) {
        const row = where.id ? users.get(where.id) : [...users.values()].find((user) => user.normalizedEmail === where.normalizedEmail);
        return row ? select(row, fields) : null;
      },
    },
    account: {
      async create({ data }) {
        const row = { id: `a${nextAccount++}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        accounts.set(`${row.provider}:${row.providerAccountId}`, row);
        return row;
      },
      async findUnique({ where }) {
        const key = where.provider_providerAccountId;
        const account = accounts.get(`${key.provider}:${key.providerAccountId}`);
        return account ? { user: users.get(account.userId) } : null;
      },
      async findFirst({ where }) {
        return [...accounts.values()].find((account) => account.userId === where.userId) ?? null;
      },
    },
  };
  const env = {
    GOOGLE_AUTH_ENABLED: "true",
    GOOGLE_CLIENT_ID: "local.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "local-secret",
    STUDENT_REGISTRATION_ENABLED: String(registration),
  };
  const google = moduleLoader({ "@/lib/prisma": { prisma } }, { process: { env } })("src/lib/server/google-auth.ts");
  return { google, prisma, users, accounts, env };
}

const profile = (email = "Student@Example.test") => ({ sub: "google-subject", email, email_verified: true });
const account = (id = "google-subject") => ({ provider: "google", providerAccountId: id, type: "oauth" });

test("Google provider requests only identity/email and rejects unverified profiles", () => {
  const { google } = harness();
  const provider = google.createGoogleProvider();
  assert.equal(provider.authorization.params.scope, "openid email");
  assert.equal(provider.options.allowDangerousEmailAccountLinking, undefined);
  assert.deepEqual(provider.profile(profile()), { id: "google-subject", email: "student@example.test", name: null, image: null,
    role: "student", sessionVersion: 0, emailVerified: null });
  assert.throws(() => provider.profile({ ...profile(), email_verified: false }), /google_profile_not_verified/);
});

test("OAuth-only creation is an explicit verified student and stores no Google tokens", async () => {
  const { google, users, accounts } = harness();
  const adapter = google.createStudentAuthAdapter();
  const user = await adapter.createUser({ name: "Ignored Google Name", email: " Student@Example.test ", emailVerified: null, image: "https://example.test/avatar" });
  assert.equal(user.normalizedEmail, "student@example.test");
  assert.equal(user.email, "student@example.test");
  assert.equal(user.password, null);
  assert.equal(user.role, "student");
  assert.equal(user.sessionVersion, 0);
  assert.ok(user.emailVerified instanceof Date);
  await adapter.linkAccount({ ...account(), userId: user.id, access_token: "must-not-persist", refresh_token: "must-not-persist", id_token: "must-not-persist" });
  const stored = [...accounts.values()][0];
  assert.deepEqual(Object.keys(stored).sort(), ["createdAt", "id", "provider", "providerAccountId", "type", "updatedAt", "userId"].sort());
  await assert.rejects(adapter.linkAccount({ ...account("second-google-subject"), userId: user.id }), /google_account_link_not_allowed/);
  assert.equal(users.size, 1);
  assert.equal(accounts.size, 1);
});

test("closed registration permits linked Google students but refuses new Google users", async () => {
  const { google, users, accounts } = harness({ registration: false });
  assert.equal(await google.allowGoogleStudentSignIn({ account: account("new"), profile: profile("new@example.test") }), false);
  const linked = { id: "linked", normalizedEmail: "linked@example.test", email: "linked@example.test", password: null,
    role: "student", isActive: true, emailVerified: new Date(), sessionVersion: 0 };
  users.set(linked.id, linked);
  accounts.set("google:linked-sub", { id: "linked-account", userId: linked.id, provider: "google", providerAccountId: "linked-sub", type: "oauth" });
  assert.equal(await google.allowGoogleStudentSignIn({ account: account("linked-sub"), profile: profile("linked@example.test") }), true);
  linked.role = "admin";
  assert.equal(await google.allowGoogleStudentSignIn({ account: account("linked-sub"), profile: profile("linked@example.test") }), false);
});

test("existing Credentials email is handed to NextAuth's safe not-linked rejection", async () => {
  const { google, users } = harness({ registration: false });
  users.set("credentials", { id: "credentials", email: "person@example.test", normalizedEmail: "person@example.test",
    password: "bcrypt-hash", role: "student", isActive: true, emailVerified: new Date(), sessionVersion: 0 });
  assert.equal(await google.allowGoogleStudentSignIn({ account: account("different-sub"), profile: profile("PERSON@example.test") }), true);
  const adapter = google.createStudentAuthAdapter();
  assert.equal((await adapter.getUserByEmail(" Person@Example.test ")).id, "credentials");
  assert.equal(google.createGoogleProvider().options.allowDangerousEmailAccountLinking, undefined);
  await assert.rejects(adapter.linkAccount({ ...account("different-sub"), userId: "credentials" }), /google_account_link_not_allowed/);
  assert.equal(users.size, 1);
});
