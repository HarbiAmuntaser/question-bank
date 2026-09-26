import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const work = mkdtempSync(join(tmpdir(), "mustawak-college-migration-"));
const oldSchemaPath = join(work, "schema-before-college.prisma");

function prisma(args) {
  return execFileSync(
    process.execPath,
    [resolve("node_modules/prisma/build/index.js"), ...args],
    { encoding: "utf8", windowsHide: true },
  );
}

try {
  const oldSchema = execFileSync(
    "git",
    ["show", "HEAD:prisma/schema.prisma"],
    { encoding: "utf8", windowsHide: true },
  );
  writeFileSync(oldSchemaPath, oldSchema);

  const diff = prisma([
    "migrate",
    "diff",
    "--from-schema-datamodel",
    oldSchemaPath,
    "--to-schema-datamodel",
    resolve("prisma/schema.prisma"),
    "--script",
  ]);
  const migration = readFileSync(
    "prisma/migrations/20260926090000_add_optional_colleges/migration.sql",
    "utf8",
  );

  for (const sql of [diff, migration]) {
    assert.match(sql, /CREATE TABLE "colleges"/);
    assert.match(sql, /"slug" TEXT NOT NULL/);
    assert.match(sql, /colleges_universityId_slug_key/);
    assert.match(sql, /ALTER TABLE "majors" ADD COLUMN\s+"collegeId" TEXT/);
    assert.match(sql, /CREATE INDEX "majors_collegeId_idx"/);
    assert.match(sql, /FOREIGN KEY \("collegeId"\) REFERENCES "colleges"\("id"\)/);
    assert.match(sql, /ON DELETE RESTRICT ON UPDATE CASCADE/);
    assert.doesNotMatch(sql, /UPDATE\s+"?majors"?|DELETE\s+FROM/i);
    assert.doesNotMatch(sql, /paid_access|payment_|access_entitlements|seo_meta/i);
  }

  assert.match(migration, /BEGIN;/);
  assert.match(migration, /COMMIT;/);
  assert.match(migration, /colleges_universityId_code_key/);
  assert.match(migration, /colleges_universityId_slug_key/);
  assert.match(migration, /colleges_universityId_isActive_idx/);
  prisma(["validate", "--schema", resolve("prisma/schema.prisma")]);
  console.log("PASS College migration matches the Prisma schema diff and contains no data rewrite");
} finally {
  rmSync(work, { recursive: true, force: true });
}
