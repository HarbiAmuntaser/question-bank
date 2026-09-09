import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { moduleLoader } from "./load-module.mjs";

function usersHarness(initial, { conflicts = 0, afterConflict = () => {} } = {}) {
  const rows = new Map(initial.map((row) => [row.id, { ...row }]));
  let transactions = 0;
  let writes = 0;
  const tx = {
    user: {
      findUnique: async ({ where }) => rows.get(where.id) ?? null,
      count: async () => [...rows.values()].filter((row) => row.role === "admin" && row.isActive).length,
      update: async ({ where, data }) => {
        writes += 1;
        const row = { ...rows.get(where.id), ...data };
        rows.set(where.id, row);
        return row;
      },
      delete: async ({ where }) => { writes += 1; rows.delete(where.id); },
    },
  };
  const prisma = {
    async $transaction(work, options) {
      transactions += 1;
      assert.equal(options.isolationLevel, "Serializable");
      if (transactions <= conflicts) {
        afterConflict(rows);
        throw new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "test" });
      }
      return work(tx);
    },
  };
  const load = moduleLoader({ "@/lib/prisma": { prisma } });
  return { users: load("src/lib/server/admin-users.ts"), rows, counts: () => ({ writes, transactions }) };
}

const admin = { id: "a", role: "admin", isActive: true };
const otherAdmin = { id: "b", role: "admin", isActive: true };
const editor = { id: "e", role: "editor", isActive: true };

test("last active administrator cannot be deleted, disabled, or demoted", async () => {
  for (const change of [null, { isActive: false }, { role: "editor" }]) {
    const h = usersHarness([admin, editor, { ...otherAdmin, isActive: false }]);
    const result = change === null ? h.users.deleteManagedUser("a", "a") : h.users.updateManagedUser("a", "a", change);
    await assert.rejects(result, (error) => error.message === "last_active_admin" && error.status === 409);
    assert.equal(h.counts().writes, 0);
  }
});

test("self lockout is blocked even when another active administrator exists", async () => {
  for (const change of [null, { isActive: false }, { role: "moderator" }]) {
    const h = usersHarness([admin, otherAdmin]);
    const result = change === null ? h.users.deleteManagedUser("a", "a") : h.users.updateManagedUser("a", "a", change);
    await assert.rejects(result, /cannot_remove_own_admin_access/);
    assert.equal(h.counts().writes, 0);
  }
});

test("normal admin operations and profile edits remain available", async () => {
  const h = usersHarness([admin, otherAdmin, editor]);
  await h.users.updateManagedUser("a", "a", { name: "Updated", role: "admin", isActive: true });
  await h.users.updateManagedUser("a", "b", { role: "editor" });
  await h.users.deleteManagedUser("a", "e");
  assert.equal(h.rows.get("a").name, "Updated");
  assert.equal(h.rows.get("b").role, "editor");
  assert.equal(h.rows.has("e"), false);
  assert.equal(h.counts().writes, 3);
});

test("actor authority is checked again inside the transaction", async () => {
  for (const actor of [editor, { ...admin, isActive: false }, { ...admin, role: "student" }]) {
    const h = usersHarness([actor, otherAdmin]);
    await assert.rejects(h.users.deleteManagedUser(actor.id, "b"), (error) => error.status === 403);
    assert.equal(h.counts().writes, 0);
  }
});

test("serialization conflicts retry with fresh permissions and a bounded limit", async () => {
  const recover = usersHarness([admin, editor], { conflicts: 1 });
  await recover.users.updateManagedUser("a", "e", { name: "Updated" });
  assert.deepEqual(recover.counts(), { transactions: 2, writes: 1 });

  const revoked = usersHarness([admin, editor], {
    conflicts: 1, afterConflict: (rows) => rows.get("a").isActive = false,
  });
  await assert.rejects(revoked.users.deleteManagedUser("a", "e"), (error) => error.status === 403);
  assert.equal(revoked.counts().writes, 0);

  const exhausted = usersHarness([admin, editor], { conflicts: 5 });
  await assert.rejects(exhausted.users.deleteManagedUser("a", "e"), /user_change_conflict/);
  assert.deepEqual(exhausted.counts(), { transactions: 3, writes: 0 });
});
