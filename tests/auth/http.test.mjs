import test from "node:test";
import assert from "node:assert/strict";
import { moduleLoader } from "../admin/load-module.mjs";

function harness({ open = true, failLimit = false } = {}) {
  let writes = 0;
  let limits = 0;
  const load = moduleLoader({
    "@/lib/server/auth-config": { authOrigin: () => "https://mustawak.com", mailConfig: () => ({}), registrationConfigured: () => open },
    "@/lib/server/auth-rate-limit": { AuthRateLimitError: class extends Error {}, requestIdentity: () => "shared", consumeAuthLimit: async () => { limits++; if (failLimit) throw new Error("unavailable"); } },
    "@/lib/server/student-accounts": { InvalidAuthTokenError: class extends Error {}, registerStudent: async () => writes++, requestStudentEmail: async () => writes++, consumeStudentToken: async () => { writes++; return "/account"; } },
  });
  return { post: load("src/lib/server/student-auth-http.ts").studentAuthPost, counts: () => ({ writes, limits }) };
}
function request(body, extra = {}) { return new Request("https://mustawak.com/api/v1/auth/register", { method: "POST", headers: { origin: "https://mustawak.com", "content-type": "application/json", ...extra }, body: JSON.stringify(body) }); }
const input = { name: "Student", email: "test@example.com", password: "twelve chars here", confirmPassword: "twelve chars here" };
test("closed registration rejects direct API calls without writes", async () => {
  const h = harness({ open: false });
  assert.equal((await h.post(request(input), "register")).status, 503);
  assert.deepEqual(h.counts(), { writes: 0, limits: 0 });
});
test("role injection and cross-origin browser submissions never create users", async () => {
  const h = harness();
  assert.equal((await h.post(request({ ...input, role: "admin" }), "register")).status, 400);
  assert.equal((await h.post(request(input, { origin: "https://evil.test" }), "register")).status, 403);
  assert.equal((await h.post(request(input, { "sec-fetch-site": "same-site" }), "register")).status, 403);
  assert.equal((await h.post(request(input, { "content-type": "text/plain" }), "register")).status, 415);
  assert.equal(h.counts().writes, 0);
});
test("distributed limiter failure fails closed", async () => {
  const h = harness({ failLimit: true });
  const response = await h.post(request(input), "register");
  assert.equal(response.status, 503);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(h.counts().writes, 0);
});
test("large bodies and unknown routes are rejected; valid registration returns generic accepted", async () => {
  const h = harness();
  assert.equal((await h.post(request({ ...input, name: "x".repeat(9000) }), "register")).status, 400);
  assert.equal((await h.post(request(input), "toString")).status, 404);
  assert.equal((await h.post(request(input), "register")).status, 202);
  assert.equal(h.counts().writes, 1);
});
