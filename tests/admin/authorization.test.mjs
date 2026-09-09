import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { NextRequest } from "next/server.js";
import { authHarness, moduleLoader, sourceFiles } from "./load-module.mjs";

const permissions = moduleLoader()("src/lib/admin-permissions.ts");
const routes = sourceFiles("src/app/api/v1/admin", "route.ts");
const actions = sourceFiles("src/app/admin", "actions.ts");
const pages = sourceFiles("src/app/admin", "page.tsx");

test("role matrix is deny-by-default, including future students and unknown permissions", () => {
  for (const resource of permissions.CONTENT_RESOURCES) {
    for (const operation of ["read", "write"]) {
      assert.equal(permissions.hasAdminPermission("admin", resource + ":" + operation), true);
      assert.equal(permissions.hasAdminPermission("editor", resource + ":" + operation), true);
      assert.equal(permissions.hasAdminPermission("moderator", resource + ":" + operation), false);
    }
  }
  for (const permission of ["users:manage", "subscriptions:manage"]) {
    assert.equal(permissions.hasAdminPermission("admin", permission), true);
    for (const role of ["editor", "moderator", "student", "toString", "", null]) {
      assert.equal(permissions.hasAdminPermission(role, permission), false);
    }
  }
  for (const role of ["admin", "editor", "moderator"]) {
    assert.equal(permissions.hasAdminPermission(role, "dashboard:read"), true);
    assert.equal(permissions.hasAdminPermission(role, "analytics:read"), true);
    assert.equal(permissions.hasAdminPermission(role, "unknown:write"), false);
  }
  assert.equal(permissions.adminPagePermission("/admin/users"), "users:manage");
  assert.equal(permissions.adminPagePermission("/admin/blog/topics"), "blog:read");
  assert.equal(permissions.adminPagePermission("/admin-new"), null);
  assert.equal(permissions.adminPagePermission("/admin/unknown"), null);
});

test("current database role and activation override a stale admin JWT", async () => {
  const h = authHarness();
  const auth = h.load("src/lib/admin-auth.ts");
  assert.equal((await auth.getAdminAccess("users:manage")).ok, true);
  h.state.role = "editor";
  assert.equal((await auth.getAdminAccess("users:manage")).status, 403);
  assert.equal((await auth.getAdminAccess("subjects:write")).ok, true);
  h.state.active = false;
  assert.equal((await auth.getAdminAccess("subjects:write")).status, 403);
  h.state.missing = true;
  assert.equal((await auth.getAdminAccess("dashboard:read")).status, 403);
  assert.equal(h.state.identityReads, 5);
});

test("session errors fail closed and never fall back to an API key", async () => {
  const h = authHarness();
  h.mocks["next-auth"].getServerSession = async () => { throw new Error("session_failure"); };
  const auth = h.load("src/lib/admin-auth.ts");
  await assert.rejects(auth.verifyAdmin(new Request("http://localhost/api/v1/admin/users", {
    headers: { "x-admin-key": "legacy-key", "x-api-key": "legacy-key" },
  }), "users:manage"), /session_failure/);
  assert.equal(h.state.sideEffects, 0);
});

for (const path of routes) {
  test("API denies unauthenticated, disabled and non-admin callers: " + path, async () => {
    for (const input of [{ signedIn: false }, { role: "student" }, { active: false }, { missing: true }]) {
      const h = authHarness(input);
      const handlers = h.load(path);
      for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"].filter((name) => typeof handlers[name] === "function")) {
        const response = await handlers[method](new Request("http://localhost/api/v1/admin/test", {
          method, headers: { "x-admin-key": "legacy-key", "x-api-key": "legacy-key" },
        }), { params: Promise.resolve({ id: "target" }) });
        assert.equal(response.status, input.signedIn === false ? 401 : 403, method);
        assert.match(response.headers.get("cache-control"), /private.*no-store/);
      }
      assert.equal(h.state.sideEffects, 0);
      if (input.signedIn === false) assert.equal(h.state.identityReads, 0);
    }
  });
}

test("editors cannot manage users and moderators cannot reach content APIs", async () => {
  for (const path of routes.filter((path) => !/[\\/](analytics|dashboard)[\\/]/.test(path))) {
    const roles = /[\\/]users[\\/]/.test(path) ? ["editor", "moderator"] : ["moderator"];
    for (const role of roles) {
      const h = authHarness({ role });
      const handlers = h.load(path);
      for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"].filter((name) => typeof handlers[name] === "function")) {
        const response = await handlers[method](new Request("http://localhost/api/v1/admin/test", { method }), {
          params: Promise.resolve({ id: "target" }),
        });
        assert.equal(response.status, 403, path + " " + method);
      }
      assert.equal(h.state.sideEffects, 0);
    }
  }
});

for (const path of actions) {
  test("Server Actions reject before reading input, fetching or writing: " + path, async () => {
    const cases = [{ signedIn: false }, { role: "student" }, { role: "moderator" }, { active: false }];
    if (/[\\/](users|subscriptions)[\\/]/.test(path)) cases.push({ role: "editor" });
    for (const input of cases) {
      const h = authHarness(input);
      const exports = h.load(path);
      for (const action of Object.values(exports).filter((value) => typeof value === "function")) {
        await assert.rejects(action(undefined, undefined), (error) => {
          assert.equal(error.name, "AdminAccessError");
          assert.equal(error.status, input.signedIn === false ? 401 : 403);
          return true;
        });
      }
      assert.equal(h.state.sideEffects, 0);
    }
  });
}

test("every admin page rejects at its own boundary before accessing data", async () => {
  for (const path of pages) {
    for (const input of [{ signedIn: false }, { role: "student" }, { active: false }]) {
      const h = authHarness(input);
      const page = h.load(path).default;
      await assert.rejects(page({ searchParams: Promise.resolve({}), params: Promise.resolve({ id: "target" }) }),
        new RegExp("REDIRECT:/auth/" + (input.signedIn === false ? "signin" : "forbidden")));
      assert.equal(h.state.sideEffects, 0, path);
    }
  }
});

test("every handler declares a resource permission; every action/page starts with its own guard", () => {
  for (const path of [...routes, ...actions, ...pages]) {
    const source = readFileSync(path, "utf8");
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    for (const fn of ast.statements.filter((node) => ts.isFunctionDeclaration(node) &&
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))) {
      if (routes.includes(path)) {
        assert.match(fn.getText(ast), /verifyAdmin\(req, "[a-z-]+:(read|write|manage)"\)/, path);
      } else {
        assert.match(fn.body.statements[0].getText(ast), /^(const admin = )?await requireAdmin(Page|Permission)\("/, path);
      }
    }
    assert.doesNotMatch(source, /ADMIN_API_KEY|unstable_cache|x-admin-key|x-api-key/, path);
  }
});

test("an active admin can read users, and an editor can reach content without elevation", async () => {
  const h = authHarness();
  h.prisma.user.findMany = async () => [{ id: "target", role: "editor" }];
  const users = h.load("src/app/api/v1/admin/users/route.ts");
  const response = await users.GET(new Request("http://localhost/api/v1/admin/users"));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, [{ id: "target", role: "editor" }]);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);

  const editor = authHarness({ role: "editor" });
  editor.mocks["@/lib/server/admin-api-fetch"].adminApiFetch = async (_path, init) => {
    assert.equal(init.method, "POST");
    return Response.json({ data: { id: "new-major" } }, { status: 201 });
  };
  const result = await editor.load("src/app/admin/majors/actions.ts").createMajorAction(new FormData());
  assert.equal(result.success, true);
});

test("middleware distinguishes anonymous and unsupported roles, and leaves public country routes outside admin auth", async () => {
  let token = null;
  let checks = 0;
  const load = moduleLoader({
    "next-auth/jwt": { getToken: async () => { checks += 1; return token; } },
  });
  const middleware = load("src/middleware.ts").default;
  let response = await middleware(new NextRequest("http://localhost/admin"));
  assert.equal(new URL(response.headers.get("location")).pathname, "/auth/signin");
  token = { sub: "actor", role: "student" };
  response = await middleware(new NextRequest("http://localhost/admin/users"));
  assert.equal(new URL(response.headers.get("location")).pathname, "/auth/forbidden");
  for (const role of ["admin", "editor", "moderator"]) {
    token = { sub: "actor", role };
    response = await middleware(new NextRequest("http://localhost/admin"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /private.*no-store/);
  }
  const before = checks;
  for (const path of ["/YE/universities", "/SA/academy", "/SA/blog", "/SA/universities"]) {
    response = await middleware(new NextRequest("http://localhost" + path));
    assert.equal(response.status, 200);
  }
  assert.equal(checks, before);
});

test("sign-in does not redirect a disabled or non-admin account back into an admin loop", async () => {
  for (const input of [{ active: false }, { role: "student" }]) {
    const h = authHarness(input);
    const page = h.load("src/app/auth/signin/page.tsx").default;
    await assert.rejects(page(), /REDIRECT:\/auth\/forbidden/);
  }
  const h = authHarness();
  await assert.rejects(h.load("src/app/auth/signin/page.tsx").default(), /REDIRECT:\/admin/);
});

test("admin, editor and moderator retain read access to dashboard and analytics", async () => {
  for (const role of ["admin", "editor", "moderator"]) {
    const h = authHarness({ role });
    h.mocks["@/lib/admin/dashboard"] = { getDashboardData: async () => ({ stats: {} }) };
    h.mocks["@/lib/admin/analytics"] = {
      parseAnalyticsDays: () => 7,
      getAnalyticsData: async () => ({ days: 7 }),
    };
    for (const resource of ["dashboard", "analytics"]) {
      const route = h.load("src/app/api/v1/admin/" + resource + "/route.ts");
      const response = await route.GET(new Request("http://localhost/api/v1/admin/" + resource));
      assert.equal(response.status, 200, role + " " + resource);
      assert.match(response.headers.get("cache-control"), /private.*no-store/);
    }
  }
});

test("valid admin sessions cannot be used for cross-origin browser mutations", async () => {
  const h = authHarness();
  const auth = h.load("src/lib/admin-auth.ts");
  for (const headers of [
    { origin: "https://other.example.test" },
    { origin: "null" },
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" },
  ]) {
    const result = await auth.verifyAdmin(new Request("http://localhost/api/v1/admin/users", {
      method: "POST", headers,
    }), "users:manage");
    assert.equal(result.status, 403);
  }
  assert.equal(h.state.identityReads, 0);
  const allowed = await auth.verifyAdmin(new Request("http://localhost/api/v1/admin/users", {
    method: "POST", headers: { origin: "http://localhost", "sec-fetch-site": "same-origin" },
  }), "users:manage");
  assert.equal(allowed.ok, true);
});
