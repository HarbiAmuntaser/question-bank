import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const loadSearchIndexing = (env = {}) => moduleLoader({}, { process: { env } })("src/lib/search-indexing.ts");

test("search indexing stays blog-only unless full is explicitly selected", () => {
  assert.equal(loadSearchIndexing({}).getSearchIndexingMode(), "blog_only");
  assert.equal(loadSearchIndexing({ SEARCH_INDEXING_MODE: "FULL" }).getSearchIndexingMode(), "blog_only");
  assert.equal(loadSearchIndexing({ SEARCH_INDEXING_MODE: "full" }).getSearchIndexingMode(), "full");
});

test("sitemap canonical filtering keeps only the exact Mustawak canonical route", () => {
  const { isCanonicalSitemapUrl } = loadSearchIndexing();
  const saPath = "/SA/blog/example-post";

  assert.equal(isCanonicalSitemapUrl(saPath, null), true);
  assert.equal(isCanonicalSitemapUrl(saPath, "https://mustawak.com/SA/blog/example-post"), true);
  assert.equal(isCanonicalSitemapUrl(saPath, "https://mustawak.com/SA/blog/example-post/"), true);
  assert.equal(isCanonicalSitemapUrl("/YE/blog/example-post", "https://mustawak.com/SA/blog/example-post"), false);
  assert.equal(isCanonicalSitemapUrl(saPath, "https://example.com/SA/blog/example-post"), false);
  assert.equal(isCanonicalSitemapUrl(saPath, "https://mustawak.com/SA/blog/example-post?source=sitemap"), false);
  assert.equal(isCanonicalSitemapUrl(saPath, "not-a-url"), false);
});

test("sitemap applies canonical filtering to posts and topics and retains College integration", () => {
  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");

  assert.match(sitemap, /select: \{ ownerId: true, noindex: true, canonicalUrl: true \}/);
  assert.ok((sitemap.match(/isCanonicalSitemapUrl\(/g) ?? []).length >= 2);
  assert.match(sitemap, /safeDynamicEntries\("colleges", collegeEntries\)/);
  assert.doesNotMatch(sitemap, /lastModified: input\.lastModified \?\? new Date\(\)/);
  assert.doesNotMatch(sitemap, /const now = new Date\(\);\s*const indexingMode/);
});
