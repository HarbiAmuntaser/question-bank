import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

test("Chapter kind migration is additive and preserves existing rows as theory", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const sql = readFileSync(
    "prisma/migrations/20260927090000_chapter_content_extensions/migration.sql",
    "utf8",
  );

  assert.ok(schema.includes("enum ChapterKind"));
  assert.ok(schema.includes("kind               ChapterKind @default(theory)"));
  assert.ok(sql.includes(`CREATE TYPE "ChapterKind" AS ENUM ('theory', 'practical')`));
  assert.ok(sql.includes(`ADD COLUMN "kind" "ChapterKind" NOT NULL DEFAULT 'theory'`));
  assert.doesNotMatch(sql, /UPDATE|DELETE|payment|entitlement|seo/i);
});

test("Chapter attachment policy centrally enforces owner, PDF signature and private storage", async () => {
  let chapterReads = 0;
  const service = moduleLoader({})("src/lib/server/chapter-attachments.ts");
  const db = {
    chapter: {
      findUnique: async (query) => {
        chapterReads += 1;
        assert.deepEqual(query, {
          where: { id: "chapter-a" },
          select: { id: true, subjectId: true },
        });
        return { id: "chapter-a", subjectId: "subject-a" };
      },
    },
  };
  const valid = {
    ownerType: "chapter",
    ownerId: "chapter-a",
    purpose: "chapter-question-bank",
    kind: "pdf",
    visibility: "private",
    contentType: "application/pdf",
    bytes: new TextEncoder().encode("%PDF-1.7\n"),
  };

  assert.deepEqual(await service.validateChapterAttachmentUpload(db, valid), {
    id: "chapter-a",
    subjectId: "subject-a",
    purpose: "chapter-question-bank",
  });
  assert.equal(chapterReads, 1);

  for (const input of [
    { ...valid, ownerType: "subject" },
    { ...valid, purpose: "attachment" },
    { ...valid, kind: "image" },
    { ...valid, visibility: "public" },
    { ...valid, bytes: new TextEncoder().encode("not a pdf") },
  ]) {
    await assert.rejects(service.validateChapterAttachmentUpload(db, input));
  }
  assert.equal(chapterReads, 1, "invalid files must be rejected before the owner lookup");
});

test("Chapter kind grouping has no extra theory UI when practical content is absent", () => {
  const groups = moduleLoader({})("src/lib/chapter-kind-groups.ts");
  const theoryOnly = groups.groupChaptersByKind([
    { id: "t1", kind: "theory" },
    { id: "t2", kind: "theory" },
  ]);
  assert.equal(theoryOnly.theory.length, 2);
  assert.equal(theoryOnly.practical.length, 0);

  const practicalOnly = groups.groupChaptersByKind([{ id: "p1", kind: "practical" }]);
  assert.equal(practicalOnly.theory.length, 0);
  assert.equal(practicalOnly.practical.length, 1);
});

test("Admin upload and delete routes enforce chapter policy and invalidate chapter cache", () => {
  const upload = readFileSync("src/app/api/v1/admin/attachments/route.ts", "utf8");
  const remove = readFileSync("src/app/api/v1/admin/attachments/[id]/route.ts", "utf8");
  const chapter = readFileSync("src/app/api/v1/admin/chapters/[id]/route.ts", "utf8");

  assert.ok(upload.includes("validateChapterAttachmentUpload(prisma"));
  assert.ok(upload.includes("chapters/attachments"));
  assert.ok(upload.includes("safeRevalidateChapterAttachment"));
  assert.ok(remove.includes("revalidateChapterCache(chapterCacheInput)"));
  assert.ok(chapter.includes("chapter_has_attachments"));
  assert.ok(chapter.includes("prisma.attachment.count"));
});

test("Public chapter metadata excludes storage details and download is access checked", () => {
  const loader = readFileSync("src/lib/server/subject-chapters.ts", "utf8");
  const source = readFileSync("src/lib/server/pdf-viewer.ts", "utf8");

  const selectStart = loader.indexOf("const attachmentRows");
  const selectEnd = loader.indexOf("const attachments", selectStart);
  const attachmentSelect = loader.slice(selectStart, selectEnd);
  assert.ok(attachmentSelect.includes("title: true"));
  assert.ok(attachmentSelect.includes("sizeBytes: true"));
  assert.ok(!attachmentSelect.includes("storageKey: true"));
  assert.ok(!attachmentSelect.includes("bucket: true"));
  assert.ok(!attachmentSelect.includes("url: true"));
  assert.match(source, /checkScopeAccess\([\s\S]*subjectId: chapter\.subjectId[\s\S]*guestSessionToken:/);
  assert.ok(source.includes("createPresignedGetUrl"));
  assert.ok(source.includes(`visibility: "private"`));
  assert.ok(source.includes(`storageProvider: "r2"`));
});

test("legacy Chapter PDF links redirect to the protected viewer", async () => {
  const ids = {
    chapterId: "11111111-1111-4111-8111-111111111111",
    attachmentId: "22222222-2222-4222-8222-222222222222",
  };
  const route = moduleLoader({})("src/app/api/v1/student/chapters/[chapterId]/attachments/[attachmentId]/route.ts");
  const response = await route.GET(new Request("https://example.test"), {
    params: Promise.resolve(ids),
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), `https://example.test/pdf-viewer/chapter/${ids.chapterId}/${ids.attachmentId}`);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("Chapter extensions remain outside Payment Scope, SEO ownership and public routes", () => {
  const payment = readFileSync("src/lib/server/payment-scope.ts", "utf8");
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
  const seoStart = schema.indexOf("enum SeoOwnerType");
  const seoOwners = schema.slice(seoStart, schema.indexOf("}", seoStart));

  assert.doesNotMatch(payment, /ChapterKind|chapterAttachmentPurpose/i);
  assert.doesNotMatch(seoOwners, /attachment/i);
  assert.doesNotMatch(sitemap, /chapter-question-bank|chapter-practical-file|chapter-solution/);
});
