import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve, join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { seedPaymentFixtures, verifyPaymentMigration, verifyR3Cleanup, f } from "../payments/fixtures.mjs";

const toolRequire = createRequire(resolve(process.env.P2_TEST_TOOLS ?? ".tmp/p2-tools/package.json"));
const { default: EmbeddedPostgres } = await import(pathToFileURL(toolRequire.resolve("embedded-postgres")));
const { SMTPServer } = toolRequire("smtp-server");
const { simpleParser } = toolRequire("mailparser");
const work = resolve(".tmp", `p2-${Date.now()}`);
mkdirSync(work, { recursive: true });
async function freePort() {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  return port;
}
const dbPort = await freePort();
const webPort = await freePort();
const mailPort = await freePort();
const password = randomBytes(24).toString("hex");
const url = `postgresql://postgres:${password}@127.0.0.1:${dbPort}/p2_test`;
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url, P2_TEST_DATABASE_URL: url,
  NEXTAUTH_SECRET: randomBytes(32).toString("hex"), NEXTAUTH_URL: `http://localhost:${webPort}`, NODE_ENV: "development",
  STUDENT_REGISTRATION_ENABLED: "true", PAYMENT_V1_ENABLED: "false", PAYMENT_LAUNCH_PLAN_IDS: "[]", PAYMENT_REVIEW_ENABLED: "false", PAYMENT_CODES_ENABLED: "false",
  SMTP_HOST: "localhost", SMTP_PORT: String(mailPort), SMTP_USER: "local-test", SMTP_PASSWORD: password,
  AUTH_EMAIL_FROM: "Mustawak Test <no-reply@example.test>", AUTH_TRUSTED_IP_HEADER: "", P2_TEST_WORK: work, NEXT_TELEMETRY_DISABLED: "1" };
const pg = new EmbeddedPostgres({ databaseDir: join(work, "postgres"), user: "postgres", password,
  port: dbPort, persistent: true, authMethod: "scram-sha-256", initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: () => {} });
let smtp;
let client;
function cli(args, options = {}) { return execFileSync(process.execPath, [resolve("node_modules/prisma/build/index.js"), ...args], { env, encoding: "utf8", windowsHide: true, ...options }); }
function child(file, extra = {}) {
  return new Promise((resolveChild, reject) => {
    const proc = spawn(process.execPath, [file], { env: { ...env, ...extra }, stdio: "inherit", windowsHide: true });
    proc.on("error", reject); proc.on("exit", (code) => code === 0 ? resolveChild() : reject(new Error(`${file} exited ${code}`)));
  });
}
try {
  console.log("Starting isolated PostgreSQL (loopback only)");
  await pg.initialise(); await pg.start(); await pg.createDatabase("p2_test");
  client = pg.getPgClient("p2_test"); await client.connect();
  const schemaDir = join(work, "prisma");
  const migrations = join(schemaDir, "migrations");
  mkdirSync(join(migrations, "00000000000000_p1_baseline"), { recursive: true });
  const baseline = execFileSync("git", ["show", "3d4ba6d:prisma/schema.prisma"], { encoding: "utf8", windowsHide: true });
  const schemaPath = join(schemaDir, "schema.prisma");
  writeFileSync(schemaPath, baseline);
  const sql = cli(["migrate", "diff", "--from-empty", "--to-schema-datamodel", schemaPath, "--script"]);
  await pg.createDatabase("p2_collision");
  const collision = pg.getPgClient("p2_collision"); await collision.connect();
  try {
    await collision.query(sql);
    await collision.query(`INSERT INTO users (id,email,password) VALUES ('a','Case@example.test','original-a'), ('b','case@example.test','original-b')`);
    await collision.query(readFileSync("prisma/migrations/20260910090000_add_student_role/migration.sql", "utf8"));
    await assert.rejects(collision.query(readFileSync("prisma/migrations/20260910090100_student_accounts/migration.sql", "utf8")), /conflicting normalized emails/);
    await collision.query("ROLLBACK");
    const unchanged = (await collision.query('SELECT id,password,role FROM users ORDER BY id')).rows;
    assert.deepEqual(unchanged, [{ id: "a", password: "original-a", role: "admin" }, { id: "b", password: "original-b", role: "admin" }]);
    assert.equal((await collision.query(`SELECT count(*)::int AS count FROM information_schema.columns WHERE table_name='users' AND column_name='normalizedEmail'`)).rows[0].count, 0);
    console.log("PASS normalized-email collision aborts migration without partial changes");
  } finally { await collision.end(); }
  writeFileSync(join(migrations, "00000000000000_p1_baseline", "migration.sql"), sql);
  writeFileSync(join(migrations, "migration_lock.toml"), 'provider = "postgresql"\n');
  cli(["migrate", "deploy", "--schema", schemaPath]);
  await client.query(`INSERT INTO users (id, email, password, role, "isActive") VALUES
    ('legacy-admin', 'Legacy.Admin@Example.test', 'existing-password-hash', 'admin', true),
    ('legacy-editor', 'editor@example.test', 'editor-password-hash', 'editor', true),
    ('legacy-moderator', 'moderator@example.test', 'moderator-password-hash', 'moderator', false)`);
  const before = (await client.query('SELECT id, email, password, role::text, "isActive" FROM users ORDER BY id')).rows;
  for (const name of ["20260910090000_add_student_role", "20260910090100_student_accounts"]) {
    mkdirSync(join(migrations, name));
    copyFileSync(join("prisma/migrations", name, "migration.sql"), join(migrations, name, "migration.sql"));
  }
  copyFileSync("prisma/schema.prisma", schemaPath);
  console.log(cli(["migrate", "deploy", "--schema", schemaPath]).split("\n").filter((line) => /Applying migration|successfully/.test(line)).join("\n"));
  const after = (await client.query('SELECT id, email, password, role::text, "isActive" FROM users ORDER BY id')).rows;
  assert.deepEqual(after, before);
  assert.equal((await client.query('SELECT "normalizedEmail" FROM users WHERE id = $1', ["legacy-admin"])).rows[0].normalizedEmail, "legacy.admin@example.test");
  await client.query(`INSERT INTO users (id, email, "normalizedEmail", password) VALUES ('default-role', 'default@example.test', 'default@example.test', 'hash')`);
  assert.equal((await client.query("SELECT role FROM users WHERE id='default-role'")).rows[0].role, "student");
  console.log("PASS migrations preserve existing roles/passwords; SQL default is student; repeat deploy is idempotent");
  cli(["migrate", "deploy", "--schema", schemaPath]);
  const seedArgs = ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"];
  const seedOptions = { env: { ...env, SEED_ADMIN_EMAIL: "legacy.admin@example.test", SEED_ADMIN_PASSWORD: "" }, encoding: "utf8", windowsHide: true };
  execFileSync(process.execPath, seedArgs, seedOptions);
  assert.deepEqual((await client.query('SELECT id, email, password, role::text, "isActive" FROM users WHERE id <> $1 ORDER BY id', ["default-role"])).rows, before);
  assert.throws(() => execFileSync(process.execPath, seedArgs, { ...seedOptions, env: { ...env, SEED_ADMIN_EMAIL: "default@example.test", SEED_ADMIN_PASSWORD: "some new long password" }, stdio: "pipe" }));
  assert.equal((await client.query("SELECT role FROM users WHERE id='default-role'")).rows[0].role, "student");
  assert.throws(() => execFileSync(process.execPath, seedArgs, { ...seedOptions, env: { ...env, SEED_ADMIN_EMAIL: "absent@example.test", SEED_ADMIN_PASSWORD: "" }, stdio: "pipe" }));
  assert.equal((await client.query("SELECT count(*)::int AS count FROM users WHERE email='absent@example.test'")).rows[0].count, 0);
  console.log("PASS real seed preserves existing admin, rejects student promotion and missing bootstrap secret");
  await seedPaymentFixtures(client);
  const p3Migration = "20260911090000_account_subject_payments";
  mkdirSync(join(migrations, p3Migration));
  copyFileSync(join("prisma/migrations", p3Migration, "migration.sql"), join(migrations, p3Migration, "migration.sql"));
  cli(["migrate", "deploy", "--schema", schemaPath]);
  assert.deepEqual(await verifyPaymentMigration(client), {
    entitlement: { userId: null, anonymousSessionId: f.anonymous, isActive: true },
    code: { paymentVersion: 0, usedCount: 1 }, request: { userId: null, subjectId: null, anonymousSessionId: f.anonymous },
  });
  cli(["migrate", "deploy", "--schema", schemaPath]);
  const p3History = await verifyPaymentMigration(client);
  const p4Migration = "20260912090000_payment_orders";
  mkdirSync(join(migrations, p4Migration));
  copyFileSync(join("prisma/migrations", p4Migration, "migration.sql"), join(migrations, p4Migration, "migration.sql"));
  console.log(cli(["migrate", "deploy", "--schema", schemaPath]).split("\n").filter((line) => /Applying migration|successfully/.test(line)).join("\n"));
  assert.deepEqual(await verifyPaymentMigration(client), p3History);
  assert.deepEqual((await client.query('SELECT id, email, password, role::text, "isActive" FROM users WHERE id LIKE $1 ORDER BY id', ["legacy-%"])).rows, before);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM payment_orders')).rows[0].count, 0);
  await client.query('UPDATE paid_access_plans SET "whatsappNumber" = $1 WHERE id = $2', ["966500000000", f.plan]);
  const historicalOrder = randomUUID(); const historicalItem = randomUUID();
  await client.query("BEGIN");
  await client.query(`INSERT INTO payment_orders (id,reference,"userId","idempotencyKey","requestHash","cartKey","activeCartKey",total,"itemCount","contactMethod","contactValue","createdAt","expiresAt","updatedAt")
    VALUES ($1,$1,$2,$1,$1,$1,$1,25,1,'whatsapp','966500000000',now()-interval '2 days',now()-interval '1 day',now())`, [historicalOrder, f.alice]);
  await client.query(`INSERT INTO payment_order_items (id,"orderId","subjectId","planId","subjectName","universityName","planTitle",price,"durationDays")
    SELECT $1,$2,s.id,p.id,s.name,u.name,p.title,p.price,p."defaultDurationDays" FROM paid_access_plans p JOIN subjects s ON s.id=p."subjectId" JOIN majors m ON m.id=s."majorId" JOIN universities u ON u.id=m."universityId" WHERE p.id=$3`, [historicalItem, historicalOrder, f.plan]);
  await client.query(`INSERT INTO payment_order_events (id,"orderId","actorId",type) VALUES ($1,$2,$3,'created')`, [randomUUID(), historicalOrder, f.alice]);
  await client.query("COMMIT");
  const p4Snapshot = (await client.query(`SELECT to_jsonb(o) AS data FROM payment_orders o ORDER BY id`)).rows;
  const p4Items = (await client.query(`SELECT * FROM payment_order_items ORDER BY id`)).rows;
  const p4Events = (await client.query(`SELECT * FROM payment_order_events ORDER BY id`)).rows;
  const p5Migration = "20260913090000_payment_review";
  mkdirSync(join(migrations, p5Migration));
  copyFileSync(join("prisma/migrations", p5Migration, "migration.sql"), join(migrations, p5Migration, "migration.sql"));
  console.log(cli(["migrate", "deploy", "--schema", schemaPath]).split("\n").filter((line) => /Applying migration|successfully/.test(line)).join("\n"));
  assert.deepEqual((await client.query(`SELECT to_jsonb(o) - 'reviewVersion' - 'reviewStartedAt' AS data FROM payment_orders o ORDER BY id`)).rows, p4Snapshot);
  assert.deepEqual((await client.query(`SELECT * FROM payment_order_items ORDER BY id`)).rows, p4Items);
  assert.deepEqual((await client.query(`SELECT * FROM payment_order_events ORDER BY id`)).rows, p4Events);
  assert.deepEqual(await verifyPaymentMigration(client), p3History);
  assert.deepEqual((await client.query('SELECT id, email, password, role::text, "isActive" FROM users WHERE id LIKE $1 ORDER BY id', ["legacy-%"])).rows, before);
  assert.equal((await client.query(`SELECT count(*)::int AS count FROM access_entitlements WHERE "orderItemId" IS NOT NULL`)).rows[0].count, 0);
  assert.equal((await client.query(`SELECT count(*)::int AS count FROM payment_ledger_entries`)).rows[0].count, 0);
  console.log("PASS P5 preserves real P4 snapshots/items/audit, P3 ownership, roles/passwords and creates no fabricated grants/payments");
  const r2Tables = ["users", "paid_access_plans", "subscription_codes", "access_entitlements", "payment_orders", "payment_order_items", "payment_order_events", "payment_review_events", "payment_ledger_entries"];
  const r2Before = [];
  for (const table of r2Tables) r2Before.push((await client.query(`SELECT to_jsonb(t) AS data FROM ${table} t ORDER BY id`)).rows);
  const r2Migration = "20260914190000_payment_admin_audit";
  mkdirSync(join(migrations, r2Migration));
  copyFileSync(join("prisma/migrations", r2Migration, "migration.sql"), join(migrations, r2Migration, "migration.sql"));
  console.log(cli(["migrate", "deploy", "--schema", schemaPath]).split("\n").filter((line) => /Applying migration|successfully/.test(line)).join("\n"));
  for (const [index, table] of r2Tables.entries()) assert.deepEqual((await client.query(`SELECT to_jsonb(t) AS data FROM ${table} t ORDER BY id`)).rows, r2Before[index]);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM payment_admin_events')).rows[0].count, 0);
  console.log("PASS R2 preserves every existing user, plan, code, grant, order and financial event without fabricated admin audit");
  const r3Migration = "20260915110000_payment_r3_legacy_media_cleanup";
  const r3Sql = readFileSync(join("prisma/migrations", r3Migration, "migration.sql"), "utf8");
  await assert.rejects(client.query(r3Sql), /payment_r3_private_media_required/);
  await client.query("ROLLBACK");
  assert.deepEqual(await verifyPaymentMigration(client), p3History);
  await client.query(`UPDATE attachments SET "storageProvider" = 'r2', visibility = 'private', bucket = 'test-private', "storageKey" = 'r3-fixture.pdf', url = NULL WHERE id = $1`, [`pdf-${f.saSummary}`]);
  mkdirSync(join(migrations, r3Migration));
  copyFileSync(join("prisma/migrations", r3Migration, "migration.sql"), join(migrations, r3Migration, "migration.sql"));
  console.log(cli(["migrate", "deploy", "--schema", schemaPath]).split("\n").filter((line) => /Applying migration|successfully/.test(line)).join("\n"));
  assert.deepEqual(await verifyR3Cleanup(client), { legacyPlans: 0, legacyCodes: 0, legacyEntitlements: 0, legacyTable: null, legacyColumns: [] });
  assert.deepEqual((await client.query(`SELECT to_jsonb(o) - 'reviewVersion' - 'reviewStartedAt' AS data FROM payment_orders o ORDER BY id`)).rows, p4Snapshot);
  assert.deepEqual((await client.query(`SELECT * FROM payment_order_items ORDER BY id`)).rows, p4Items);
  assert.deepEqual((await client.query(`SELECT * FROM payment_order_events ORDER BY id`)).rows, p4Events);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM payment_admin_events')).rows[0].count, 0);
  console.log("PASS R3 blocks unsafe paid media, removes only legacy payment data and preserves financial/audit history");
  cli(["migrate", "deploy", "--schema", schemaPath]);
  const drift = cli(["migrate", "diff", "--from-url", url, "--to-schema-datamodel", resolve("prisma/schema.prisma"), "--script"]);
  assert.match(drift, /empty migration/i);
  console.log("PASS P3-R3 migrations preserve roles/passwords and financial history with no schema drift");
  // Real TLS mail delivery stays inside this test process, never external recipients.
  const cert = join(work, "localhost.pem");
  const key = join(work, "localhost-key.pem");
  execFileSync(process.env.P2_TEST_OPENSSL ?? "C:/Program Files/Git/usr/bin/openssl.exe", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-days", "2", "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"], { windowsHide: true, stdio: "ignore" });
  env.NODE_EXTRA_CA_CERTS = cert;
  const mailbox = join(work, "mailbox.json");
  const messages = [];
  writeFileSync(mailbox, "[]");
  env.P2_TEST_MAILBOX = mailbox;
  smtp = new SMTPServer({ key: readFileSync(key), cert: readFileSync(cert), logger: false,
    onAuth(auth, session, callback) { callback(auth.username === "local-test" && auth.password === password ? null : new Error("invalid"), { user: "test" }); },
    onData(stream, session, callback) {
      let raw = ""; stream.on("data", (chunk) => raw += chunk); stream.on("end", async () => {
        try {
          const parsed = await simpleParser(raw);
          messages.push({ to: session.envelope.rcptTo.map((recipient) => recipient.address), text: parsed.text });
          writeFileSync(mailbox, JSON.stringify(messages)); callback();
        } catch (error) { callback(error); }
      });
    },
  });
  await new Promise((r, reject) => { smtp.once("error", reject); smtp.listen(mailPort, "127.0.0.1", r); });
  await child("tests/auth/database-integration.mjs");
  if (process.argv.includes("--payments")) await child("tests/payments/database-integration.mjs");
  if (process.argv.includes("--orders")) await child("tests/orders/database-integration.mjs");
  if (process.argv.includes("--reviews")) await child("tests/reviews/database-integration.mjs");
  if (process.argv.includes("--release")) await child("tests/release/database-integration.mjs");
  if (process.argv.includes("--security")) await child("tests/security/database-integration.mjs");
  if (process.argv.includes("--cleanup")) await child("tests/r3/database-integration.mjs");
  if (!process.argv.includes("--no-browser") && !process.argv.includes("--skip-auth-browser")) await child("tests/auth/browser-integration.mjs");
  if (process.argv.includes("--payments") && !process.argv.includes("--no-browser")) await child("tests/payments/browser-integration.mjs");
  if (process.argv.includes("--orders") && !process.argv.includes("--no-browser")) await child("tests/orders/browser-integration.mjs");
  if (process.argv.includes("--reviews") && !process.argv.includes("--no-browser")) await child("tests/reviews/browser-integration.mjs");
  if (process.argv.includes("--build")) {
    console.log("Building against the isolated database with registration disabled");
    execFileSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
      env: { ...env, NODE_ENV: "production", STUDENT_REGISTRATION_ENABLED: "false" }, windowsHide: true, stdio: "inherit",
    });
  }
  console.log(`P2 integration artifacts: ${work}`);
} finally {
  if (smtp) await new Promise((r) => smtp.close(r));
  if (client) await client.end();
  await pg.stop();
}
