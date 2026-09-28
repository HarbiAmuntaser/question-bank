import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

function loadService(prisma = {}) {
  return moduleLoader({ "@/lib/prisma": { prisma } })("src/lib/server/education-structure.ts");
}

test("Major admin writes cannot bypass the centralized placement service", () => {
  const createRoute = readFileSync("src/app/api/v1/admin/majors/route.ts", "utf8");
  const updateRoute = readFileSync("src/app/api/v1/admin/majors/[id]/route.ts", "utf8");
  assert.match(createRoute, /createMajorWithPlacement/);
  assert.doesNotMatch(createRoute, /prisma\.major\.create/);
  assert.match(updateRoute, /updateMajorWithPlacement/);
  assert.doesNotMatch(updateRoute, /prisma\.major\.update/);
});

test("College migration is additive and preserves existing Major and payment ownership", () => {
  const sql = readFileSync(
    "prisma/migrations/20260926090000_add_optional_colleges/migration.sql",
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "colleges"/);
  assert.match(sql, /"slug" TEXT NOT NULL/);
  assert.match(sql, /colleges_universityId_slug_key/);
  assert.match(sql, /ADD COLUMN "collegeId" TEXT/);
  assert.match(sql, /ON DELETE RESTRICT/);
  assert.match(
    sql,
    /CONSTRAINT "colleges_universityId_fkey"[\s\S]*?ON DELETE RESTRICT ON UPDATE CASCADE/,
  );
  assert.doesNotMatch(sql, /UPDATE "majors"|UPDATE majors/i);
  assert.doesNotMatch(sql, /paid_access|payment_|access_entitlements|seo_meta/i);

  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /collegeId\s+String\?/);
  assert.match(schema, /college\s+College\?[^\n]+onDelete: Restrict/);
  assert.match(schema, /university\s+University[^\n]+onDelete: Restrict/);
  assert.match(schema, /universityId\s+String\n\s+collegeId/);
  assert.match(schema, /slug\s+String/);
  assert.match(schema, /@@unique\(\[universityId, slug\]\)/);
});

test("College slug normalization is Unicode-safe and rejects reserved route markers", async () => {
  const slugs = moduleLoader({})("src/lib/college-slugs.ts");

  assert.equal(slugs.buildCollegeSlug("  كلية الهندسة والتقنية  "), "كلية-الهندسة-والتقنية");
  assert.equal(slugs.normalizeCollegeSlug("Computer_ Science!"), "computer-science");
  assert.deepEqual(slugs.validateCollegeSlug("Majors"), {
    ok: false,
    error: "reserved_college_slug",
  });
});

test("College service normalizes slugs even when called outside the HTTP validator", async () => {
  let createData;
  const tx = {
    university: {
      findUnique: async () => ({ institutionType: "university" }),
    },
    college: {
      create: async ({ data }) => {
        createData = data;
        return { id: "college-a", ...data };
      },
    },
  };
  const service = loadService({ $transaction: async (callback) => callback(tx) });

  await service.createCollege({
    universityId: "university-a",
    name: "College A",
    slug: "  College_A!  ",
    code: null,
    isActive: true,
    createdBy: "admin-a",
  });

  assert.equal(createData.slug, "college-a");
});

test("server-side placement rejects cross-university Colleges", async () => {
  const service = loadService();
  const db = {
    university: {
      findUnique: async () => ({ id: "university-a", institutionType: "university" }),
    },
    college: {
      findUnique: async () => ({ universityId: "university-b" }),
    },
  };

  await assert.rejects(
    service.validateMajorPlacement(db, {
      universityId: "university-a",
      collegeId: "college-b",
    }),
    /college_university_mismatch/,
  );
});

test("Academy and School Majors remain direct and cannot receive a College", async () => {
  const service = loadService();
  let collegeReads = 0;
  const db = {
    university: {
      findUnique: async () => ({ id: "academy-a", institutionType: "academy" }),
    },
    college: {
      findUnique: async () => {
        collegeReads += 1;
        return { universityId: "academy-a" };
      },
    },
  };

  await service.validateMajorPlacement(db, { universityId: "academy-a", collegeId: null });
  await assert.rejects(
    service.validateMajorPlacement(db, {
      universityId: "academy-a",
      collegeId: "college-a",
    }),
    /college_not_allowed_for_institution/,
  );
  assert.equal(collegeReads, 0);
});

test("disabling a College does not update or deactivate its Majors", async () => {
  let majorWrites = 0;
  let updateData;
  const tx = {
    university: {
      findUnique: async () => ({ institutionType: "university" }),
    },
    college: {
      findUnique: async () => ({
        universityId: "university-a",
        _count: { majors: 2 },
      }),
      update: async ({ data }) => {
        updateData = data;
        return { id: "college-a", universityId: "university-a", ...data };
      },
    },
    major: new Proxy({}, {
      get: () => async () => {
        majorWrites += 1;
      },
    }),
  };
  const service = loadService({ $transaction: async (callback) => callback(tx) });

  await service.updateCollege("college-a", { isActive: false });
  assert.deepEqual(updateData, { isActive: false });
  assert.equal(majorWrites, 0);
});

test("deleting a College with Majors is rejected before delete", async () => {
  let deletes = 0;
  const tx = {
    college: {
      findUnique: async () => ({
        id: "college-a",
        universityId: "university-a",
        _count: { majors: 1 },
      }),
      delete: async () => {
        deletes += 1;
      },
    },
  };
  const service = loadService({ $transaction: async (callback) => callback(tx) });

  await assert.rejects(service.deleteCollege("college-a"), /college_has_majors/);
  assert.equal(deletes, 0);
});

test("College slug changes synchronize its SEO rows in the same transaction", async () => {
  let seoUpdate;
  const tx = {
    university: {
      findUnique: async () => ({ institutionType: "university" }),
    },
    college: {
      findUnique: async () => ({ universityId: "university-a", _count: { majors: 0 } }),
      update: async ({ data }) => ({ id: "college-a", universityId: "university-a", ...data }),
    },
    seoMeta: {
      updateMany: async (query) => {
        seoUpdate = query;
      },
    },
  };
  const service = loadService({ $transaction: async (callback) => callback(tx) });

  await service.updateCollege("college-a", { slug: "  Engineering College  " });

  assert.deepEqual(seoUpdate, {
    where: { ownerType: "college", ownerId: "college-a" },
    data: { slug: "engineering-college" },
  });
});

test("deleting an unlinked College removes polymorphic SEO before the College row", async () => {
  const calls = [];
  const tx = {
    college: {
      findUnique: async () => ({
        id: "college-a",
        universityId: "university-a",
        _count: { majors: 0 },
      }),
      delete: async () => {
        calls.push("college");
        return { id: "college-a" };
      },
    },
    seoMeta: {
      deleteMany: async (query) => {
        calls.push("seo");
        assert.deepEqual(query, { where: { ownerType: "college", ownerId: "college-a" } });
      },
    },
  };
  const service = loadService({ $transaction: async (callback) => callback(tx) });

  await service.deleteCollege("college-a");
  assert.deepEqual(calls, ["seo", "college"]);
});

test("College gains public SEO ownership and routing but remains outside payment scope", () => {
  const payment = readFileSync("src/lib/server/payment-scope.ts", "utf8");
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const route = readFileSync("src/app/[cc]/[type]/universities/[...slug]/page.tsx", "utf8");
  const migration = readFileSync(
    "prisma/migrations/20260928090000_public_college_pages/migration.sql",
    "utf8",
  );
  const seoOwners = schema.match(/enum SeoOwnerType \{([\s\S]*?)\}/)?.[1] ?? "";

  assert.doesNotMatch(payment, /college/i);
  assert.match(seoOwners, /\bcollege\b/);
  assert.match(route, /collegesIdx|findIndexCI\(segs, "colleges"\)/);
  assert.match(migration, /ALTER TYPE "SeoOwnerType" ADD VALUE 'college'/);
  assert.doesNotMatch(migration, /payment|entitlement|order/i);
});
