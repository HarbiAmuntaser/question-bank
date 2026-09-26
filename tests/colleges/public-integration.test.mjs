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
  assert.equal(
    groupsModule.selectCollegeMajorGroup(result.collegeGroups, "college-b")?.key,
    "college-b",
  );
  assert.equal(
    groupsModule.selectCollegeMajorGroup(result.collegeGroups, "missing")?.key,
    "college-a",
  );
});

test("no Colleges leaves the existing Major list intact", () => {
  const majors = [major("major-a", null), major("major-b", null)];
  const result = groupsModule.buildCollegeMajorGroups([], majors);

  assert.deepEqual(result.collegeGroups, []);
  assert.deepEqual(result.universityMajors, majors);
});

test("public contracts add College data without introducing public College routes", () => {
  const universities = readFileSync("src/lib/server/public-universities.ts", "utf8");
  const majors = readFileSync("src/lib/server/public-majors.ts", "utf8");
  const listApi = readFileSync("src/app/api/v1/student/majors/route.ts", "utf8");
  const page = readFileSync("src/app/[cc]/[type]/universities/[...slug]/page.tsx", "utf8");

  assert.match(universities, /colleges:\s*\{[\s\S]*?where:\s*\{ isActive: true \}/);
  assert.match(universities, /collegeId:\s*true/);
  assert.match(universities, /new Map\(university\.colleges/);
  assert.match(majors, /college:\s*\{[\s\S]*?slug:\s*true/);
  assert.match(listApi, /collegeId:\s*true/);
  assert.match(page, /isUniversityType && activeColleges\.length > 0/);
  assert.match(page, /university-majors-section/);
  assert.doesNotMatch(page, /findIndexCI\(segs, "colleges"\)|collegesIdx/);
});

test("College remains outside SEO ownership, sitemap routing and payment scope", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const payment = readFileSync("src/lib/server/payment-scope.ts", "utf8");
  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
  const seoOwners = schema.match(/enum SeoOwnerType \{([\s\S]*?)\}/)?.[1] ?? "";

  assert.doesNotMatch(seoOwners, /college/i);
  assert.doesNotMatch(payment, /college/i);
  assert.doesNotMatch(sitemap, /college/i);
});
