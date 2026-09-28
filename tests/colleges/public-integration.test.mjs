import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const groupsModule = moduleLoader({})("src/lib/public/college-major-groups.ts");

function major(id, collegeId) {
  return {
    id,
    name: id,
    code: null,
    collegeId,
    college: null,
    degreeType: null,
    durationYears: null,
    _count: { subjects: 0 },
  };
}

test("active Colleges group their Majors while null and inactive College links stay visible", () => {
  const colleges = [
    { id: "college-a", name: "College A", slug: "college-a", code: null },
    { id: "college-b", name: "College B", slug: "college-b", code: null },
  ];
  const majors = [
    major("major-a", "college-a"),
    major("major-b", "college-b"),
    major("major-direct", null),
    major("major-inactive-college", "college-hidden"),
  ];

  const result = groupsModule.buildCollegeMajorGroups(colleges, majors);

  assert.deepEqual(result.collegeGroups.map((group) => [group.key, group.majors.map((item) => item.id)]), [
    ["college-a", ["major-a"]],
    ["college-b", ["major-b"]],
  ]);
  assert.deepEqual(result.universityMajors.map((item) => item.id), [
    "major-direct",
    "major-inactive-college",
  ]);
});

test("no Colleges leaves the existing Major list intact", () => {
  const majors = [major("major-a", null), major("major-b", null)];
  const result = groupsModule.buildCollegeMajorGroups([], majors);

  assert.deepEqual(result.collegeGroups, []);
  assert.deepEqual(result.universityMajors, majors);
});

test("University pages link active Colleges to dedicated pages and preserve direct Majors", () => {
  const universities = readFileSync("src/lib/server/public-universities.ts", "utf8");
  const majors = readFileSync("src/lib/server/public-majors.ts", "utf8");
  const listApi = readFileSync("src/app/api/v1/student/majors/route.ts", "utf8");
  const page = readFileSync("src/app/[cc]/[type]/universities/[...slug]/page.tsx", "utf8");
  const grid = readFileSync("src/components/public/university-college-grid.tsx", "utf8");
  const majorDetails = readFileSync("src/components/public/major-details.tsx", "utf8");

  assert.match(universities, /colleges:\s*\{[\s\S]*?where:\s*\{ isActive: true \}/);
  assert.match(universities, /collegeId:\s*true/);
  assert.match(universities, /new Map\(university\.colleges/);
  assert.match(majors, /college:\s*\{[\s\S]*?slug:\s*true/);
  assert.match(listApi, /collegeId:\s*true/);
  assert.match(page, /isUniversityType && activeColleges\.length > 0/);
  assert.match(page, /university-majors-section/);
  assert.match(page, /findIndexCI\(segs, "colleges"\)|collegesIdx/);
  assert.match(page, /<UniversityCollegeGrid/);
  assert.match(page, /redirect\(\`\$\{universityBasePath\}\/colleges\//);
  assert.doesNotMatch(page, /UniversityCollegeSelector/);
  assert.match(grid, /\/colleges\/\$\{encodeURIComponent\(college\.slug\)\}/);
  assert.match(majorDetails, /\/majors\//);
  assert.doesNotMatch(majorDetails, /\/colleges\/[^\n]*\/majors\//);
});

test("College page is university-only, fail-closed and does not request Major counts", () => {
  const page = readFileSync("src/app/[cc]/[type]/universities/[...slug]/page.tsx", "utf8");
  const loader = readFileSync("src/lib/server/public-colleges.ts", "utf8");
  const details = readFileSync("src/components/public/college-details.tsx", "utf8");

  assert.match(page, /type !== "university"[\s\S]*?notFound\(\)/);
  assert.match(loader, /universityId: university\.id, isActive: true/);
  assert.match(loader, /institutionType: "university"/);
  assert.match(loader, /collegeKey\.includes\("\/"\)/);
  assert.doesNotMatch(loader, /_count/);
  assert.doesNotMatch(details, /_count|عدد المواد|عدد الاختبارات|مقررات/);
  assert.match(details, /college\.university\.name/);
  assert.match(details, /college\.name/);
  assert.match(details, /<MajorsList/);
});

test("public College loader scopes the College to its University and batches SEO reads", async () => {
  let collegeQuery;
  let seoReads = 0;
  const prisma = {
    seoMeta: {
      findMany: async ({ where }) => {
        seoReads += 1;
        if (where.ownerType === "university") return [{ ownerId: "university-a" }];
        return [
          { id: "seo-college", ownerId: "college-a", slug: "engineering" },
          { id: "seo-university", ownerId: "university-a", slug: "university-a" },
          { id: "seo-major", ownerId: "major-a", slug: "computer-science" },
        ];
      },
    },
    university: {
      findFirst: async () => ({ id: "university-a" }),
    },
    college: {
      findFirst: async (query) => {
        collegeQuery = query;
        return {
          id: "college-a",
          universityId: "university-a",
          name: "Engineering",
          slug: "engineering",
          code: null,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          updatedAt: new Date("2026-01-02T00:00:00Z"),
          university: {
            id: "university-a",
            name: "University A",
            code: "UA",
            logoUrl: null,
            countryCode: "SA",
            institutionType: "university",
            visibility: "country",
            createdAt: new Date("2026-01-01T00:00:00Z"),
            updatedAt: new Date("2026-01-02T00:00:00Z"),
          },
          majors: [{
            id: "major-a",
            name: "Computer Science",
            code: "CS",
            collegeId: "college-a",
            degreeType: "bachelor",
            durationYears: 4,
          }],
        };
      },
    },
  };
  const loader = moduleLoader({
    "@/lib/prisma": { prisma },
    "@/config/public-features": { getPublicVisibilityCacheKey: () => "test" },
    "@/lib/server/public-content-visibility": { publicUniversityWhere: () => ({}) },
    "@/lib/server/public-universities": {
      normalizePublicUniversityCode: (value) => ({ clean: value, variants: [value] }),
      normalizePublicUniversitySlug: (parts) => ({
        slugPath: parts.join("/"),
        variants: [parts.join("/")],
        last: parts.at(-1) ?? "",
      }),
    },
    "next/cache": { unstable_cache: (fn) => fn },
  })("src/lib/server/public-colleges.ts");

  const result = await loader.getPublicCollegeByRouteKeys("university-a", "engineering");

  assert.equal(result.id, "college-a");
  assert.equal(result.majors[0].seo.slug, "computer-science");
  assert.equal(collegeQuery.where.universityId, "university-a");
  assert.equal(collegeQuery.where.isActive, true);
  assert.equal(collegeQuery.select.majors.where.isActive, true);
  assert.equal(Object.hasOwn(collegeQuery.select.majors.select, "_count"), false);
  assert.equal(seoReads, 2);
});

test("College canonical metadata ignores query filters", () => {
  const page = readFileSync("src/app/[cc]/[type]/universities/[...slug]/page.tsx", "utf8");
  const metadataBlock =
    page.match(/\/\/ ---- College metadata ----([\s\S]*?)\/\/ ---- Major metadata ----/)?.[1] ?? "";

  assert.match(metadataBlock, /const canonicalPath = \`\/\$\{canonicalCountry\}\/university\/universities\//);
  assert.match(metadataBlock, /\/colleges\/\$\{encodeURIComponent\(canonicalCollege\)\}/);
  assert.doesNotMatch(metadataBlock, /sp\.|searchParams|degreeQuery|\?college|\?degree/);
});

test("College participates in SEO and sitemap but remains outside payment scope", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const payment = readFileSync("src/lib/server/payment-scope.ts", "utf8");
  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
  const seoOwnersSource = readFileSync("src/app/api/v1/admin/seo-meta/owners/route.ts", "utf8");
  const seoValidation = readFileSync("src/validations/seo-meta.ts", "utf8");
  const seoOwnerEnum = schema.match(/enum SeoOwnerType \{([\s\S]*?)\}/)?.[1] ?? "";

  assert.match(seoOwnerEnum, /\bcollege\b/);
  assert.doesNotMatch(payment, /college/i);
  assert.match(sitemap, /async function collegeEntries/);
  assert.match(sitemap, /safeDynamicEntries\("colleges", collegeEntries\)/);
  assert.match(seoOwnersSource, /type === "college"/);
  assert.match(seoValidation, /\["chapter", "college"\]\.includes\(data\.ownerType\)/);
});
