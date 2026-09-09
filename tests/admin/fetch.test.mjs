import test from "node:test";
import assert from "node:assert/strict";
import { moduleLoader } from "./load-module.mjs";

function fetchHarness(env = { NODE_ENV: "production", NEXTAUTH_URL: "https://admin.example.test" }) {
  const calls = [];
  const load = moduleLoader({
    "next/headers": { headers: async () => new Headers({ cookie: "session=actual", host: "untrusted.example.test" }) },
    "@/lib/server/request-origin": { getRequestOrigin: async () => "http://localhost:3000" },
  }, {
    process: { env },
    fetch: async (url, init) => { calls.push({ url, init }); return Response.json({ ok: true }); },
  });
  return { calls, fetch: load("src/lib/server/admin-api-fetch.ts").adminApiFetch };
}

test("internal requests use the real session, configured origin, no-store, and no service key", async () => {
  const h = fetchHarness();
  await h.fetch("/api/v1/admin/subjects", {
    method: "POST", body: JSON.stringify({ name: "Test" }),
    headers: { cookie: "session=forged", "x-admin-key": "legacy", "x-api-key": "legacy" },
    cache: "force-cache", next: { revalidate: 3600 }, redirect: "follow",
  });
  const { url, init } = h.calls[0];
  assert.equal(url.origin, "https://admin.example.test");
  assert.equal(init.headers.get("cookie"), "session=actual");
  assert.equal(init.headers.has("x-admin-key"), false);
  assert.equal(init.headers.has("x-api-key"), false);
  assert.equal(init.headers.get("content-type"), "application/json");
  assert.equal(init.cache, "no-store");
  assert.equal(init.next, undefined);
  assert.equal(init.redirect, "error");
});

test("an internal fetch cannot send session cookies outside the admin API origin/path", async () => {
  for (const path of ["https://other.example.test/api/v1/admin/users", "//other.example.test/api/v1/admin/users",
    "/api/v1/admin/../../public", "/api/v1/subjects"]) {
    const h = fetchHarness();
    await assert.rejects(h.fetch(path), /invalid_admin_api_path/);
    assert.equal(h.calls.length, 0);
  }
});

test("production requires a configured origin before any cookies are forwarded", async () => {
  const h = fetchHarness({ NODE_ENV: "production" });
  await assert.rejects(h.fetch("/api/v1/admin/users"), /NEXTAUTH_URL_required/);
  assert.equal(h.calls.length, 0);
});

test("development stays on the local server even when NEXTAUTH_URL names production", async () => {
  const h = fetchHarness({ NODE_ENV: "development", NEXTAUTH_URL: "https://production.example.test" });
  await h.fetch("/api/v1/admin/subjects");
  assert.equal(h.calls[0].url.origin, "http://localhost:3000");
});

test("admin JSON errors and success responses cannot be publicly cached", () => {
  const http = moduleLoader()("src/lib/server/admin-http.ts");
  for (const response of [
    http.json({ data: [] }, 200, { "cache-control": "public, max-age=3600" }),
    http.bad("conflict", undefined, 409),
    http.notFound(),
  ]) {
    assert.match(response.headers.get("cache-control"), /private.*no-store/);
  }
});
