import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "./load-module.mjs";

const source = (path) => readFileSync(path, "utf8");

test("SEO import accepts only the approved fields and preserves structured JSON-LD", () => {
  const { parseSeoImportText } = moduleLoader()("src/lib/admin/seo-import.ts");
  const result = parseSeoImportText(JSON.stringify({
    metaTitle: "  Page title  ",
    canonicalUrl: "https://mustawak.com/page",
    noindex: false,
    schemaJson: { "@context": "https://schema.org", "@type": "WebPage" },
  }));

  assert.equal(result.ok, true);
  assert.equal(result.data.metaTitle, "Page title");
  assert.equal(result.data.noindex, false);
  assert.match(result.data.schemaJson, /schema\.org/);

  for (const payload of [
    { ownerId: "must-not-change" },
    { slug: "must-not-change" },
    { nofollow: "false" },
    { canonicalUrl: "javascript:alert(1)" },
  ]) {
    assert.equal(parseSeoImportText(JSON.stringify(payload)).ok, false);
  }
});

test("SEO JSON-LD parser rejects oversized, primitive and dangerous structures", () => {
  const { parseSeoSchemaJson } = moduleLoader()("src/lib/seo-schema-json.ts");
  assert.equal(parseSeoSchemaJson("true").ok, false);
  assert.equal(parseSeoSchemaJson(JSON.stringify({ value: "x".repeat(70_000) })).ok, false);
  assert.equal(parseSeoSchemaJson({ constructor: { prototype: {} } }).ok, false);
  assert.equal(parseSeoSchemaJson({ "@context": "https://schema.org", "@type": "Article" }).ok, true);
});

test("admin list server components no longer make same-origin HTTP requests", () => {
  const tables = [
    "src/components/admin/universities/universities-table.tsx",
    "src/components/admin/colleges/colleges-table.tsx",
    "src/components/admin/majors/majors-table.tsx",
    "src/components/admin/subjects/subjects-table.tsx",
    "src/components/admin/chapters/chapters-table.tsx",
    "src/components/admin/questions/questions-table.tsx",
    "src/components/admin/summaries/summaries-table.tsx",
    "src/components/admin/blog/blog-posts-table.tsx",
    "src/components/admin/blog/blog-taxonomy-table.tsx",
  ];

  for (const path of tables) {
    assert.doesNotMatch(source(path), /adminApiFetch|fetch\(\s*["'`]\/api\/v1\/admin/);
  }
  assert.match(source("src/lib/server/admin-content-lists.ts"), /take: pageSize/);
  assert.match(source("src/lib/server/admin-editorial-lists.ts"), /take: pageSize/);
});

test("admin query limits and error boundary fail safely", () => {
  const universities = source("src/app/api/v1/admin/universities/route.ts");
  const selectRoute = source("src/app/api/v1/admin/universities/select/route.ts");
  const boundary = source("src/app/admin/error.tsx");

  assert.doesNotMatch(universities, /pageSizeRaw|1000/);
  assert.match(selectRoute, /take: 50/);
  assert.match(selectRoute, /query\.length > 100/);
  assert.doesNotMatch(boundary, /error\.message/);
  assert.match(boundary, /error\.digest/);
});

test("remaining write dialogs use field-level validation or an existing equivalent", () => {
  assert.match(source("src/components/admin/seo/SeoMetaDialog.tsx"), /useAdminFormValidation/);
  assert.match(source("src/components/admin/chapters/chapter-dialog.tsx"), /useAdminFormValidation/);
  assert.match(source("src/components/admin/users/UserDialog.tsx"), /useAdminFormValidation/);
  assert.match(source("src/components/admin/summaries/summary-dialog.tsx"), /fieldErrors/);
  assert.match(source("src/components/admin/questions/question-dialog.tsx"), /required|minLength|toast/);
  assert.match(source("src/components/admin/blog/blog-post-dialog.tsx"), /required|minLength|toast/);
});
