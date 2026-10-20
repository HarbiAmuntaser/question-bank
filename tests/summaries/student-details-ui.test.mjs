import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("student summary details omit redundant metadata and hierarchy links", () => {
  const details = readFileSync(
    "src/components/public/study-summaries/study-summary-details.tsx",
    "utf8",
  );

  assert.equal(details.includes("summary.readingMinutes"), false);
  assert.equal(details.includes("summary.isFeatured"), false);
  assert.equal(details.includes("summary.chapter.name"), false);
  assert.equal(details.includes("const uniLink ="), false);
  assert.equal(details.includes("const majorLink ="), false);
  assert.equal(details.includes(">PDF<"), false);
  assert.ok(details.includes("<ContextBackLink href={subjectLink} label={subject.name}"));
  assert.ok(details.includes("فتح ملف PDF"));
});
