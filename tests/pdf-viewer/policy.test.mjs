import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { moduleLoader } from "../admin/load-module.mjs";

const summaryId = "11111111-1111-4111-8111-111111111111";
const chapterId = "22222222-2222-4222-8222-222222222222";
const attachmentId = "33333333-3333-4333-8333-333333333333";
const secret = "watermark-secret-used-only-by-this-test-suite";

function attachment(ownerType = "study_summary", ownerId = summaryId) {
  return {
    id: attachmentId,
    title: "Reference PDF",
    originalName: "reference.pdf",
    kind: "pdf",
    ownerType,
    ownerId,
    storageProvider: "r2",
    visibility: "private",
    bucket: "private",
    storageKey: "references/file.pdf",
    contentType: "application/pdf",
    checksumSha256: "a".repeat(64),
    url: null,
    meta: { purpose: "chapter-question-bank" },
  };
}

function harness({ access, studentId = "student-private-id" } = {}) {
  const state = { signed: 0 };
  const summaryAttachment = attachment();
  const chapterAttachment = attachment("chapter", chapterId);
  const prisma = {
    studySummary: {
      findUnique: async () => ({
        id: summaryId,
        title: "Summary",
        status: "published",
        publishedAt: new Date("2026-10-01T00:00:00Z"),
        subjectId: "subject-a",
        chapterId,
        pdfAttachmentId: attachmentId,
        pdfAttachment: summaryAttachment,
      }),
    },
    chapter: { findFirst: async () => ({ id: chapterId, subjectId: "subject-a" }) },
    attachment: { findFirst: async () => chapterAttachment },
  };
  const load = moduleLoader({
    "@/lib/prisma": { prisma },
    "@/lib/chapter-attachments": { readChapterAttachmentPurpose: (meta) => meta?.purpose ?? null },
    "@/lib/server/public-content-visibility": { isPublicStudySummaryId: async () => true },
    "@/lib/server/payment-scope": {
      getPaymentStudent: async () => studentId ? { id: studentId } : null,
      publishedSubjectWhere: () => ({ isActive: true }),
    },
    "@/lib/server/code-access-cookie": { guestAccessTokenFromRequest: () => "guest-cookie-not-exposed" },
    "@/lib/server/access-control": {
      checkStudySummaryAccess: async () => access,
      checkScopeAccess: async () => access,
    },
    "@/lib/server/storage/config": { getR2StorageConfig: () => ({ signedUrlTtlSeconds: 300 }) },
    "@/lib/server/storage": {
      createPresignedGetUrl: async () => {
        state.signed += 1;
        return "https://private.example.test/file.pdf?signature=temporary";
      },
    },
  }, { process: { env: { DOCUMENT_WATERMARK_SECRET: secret } } });
  return { state, service: load("src/lib/server/pdf-viewer.ts") };
}

test("paid account PDF uses a deterministic opaque watermark without exposing identity", async () => {
  const access = {
    allowed: true,
    reason: "entitled",
    effectiveAccessType: "paid",
    accessSource: "manual",
    codeGrantId: null,
  };
  const { state, service } = harness({ access });
  const source = await service.getSummaryPdfViewerSource(new Request("https://example.test"), summaryId);
  assert.equal(state.signed, 1);
  assert.match(source.watermark.reference, /^WM1-[A-F0-9]{12}$/);
  assert.equal(source.watermark.traceable, true);
  assert.match(source.watermark.text, /^MUSTAWAK\.COM/);
  assert.doesNotMatch(JSON.stringify(source.watermark), /student-private-id|guest-cookie-not-exposed|signature=temporary/);
  const expiresIn = Date.parse(source.sourceExpiresAt) - Date.now();
  assert.ok(expiresIn >= 299_000 && expiresIn <= 300_000);
});

test("guest paid PDF is traced to the grant while free PDF needs no private principal", async () => {
  const guest = harness({
    access: {
      allowed: true,
      reason: "entitled",
      effectiveAccessType: "paid",
      accessSource: "guest_code",
      codeGrantId: "grant-private-id",
    },
    studentId: null,
  });
  const guestSource = await guest.service.getChapterAttachmentPdfViewerSource(
    new Request("https://example.test"),
    chapterId,
    attachmentId,
  );
  assert.match(guestSource.watermark.reference, /^WM1-[A-F0-9]{12}$/);
  assert.doesNotMatch(JSON.stringify(guestSource.watermark), /grant-private-id|guest-cookie-not-exposed/);

  const free = harness({
    access: {
      allowed: true,
      reason: "free",
      effectiveAccessType: "free",
      accessSource: null,
      codeGrantId: null,
    },
    studentId: null,
  });
  const freeSource = await free.service.getSummaryPdfViewerSource(new Request("https://example.test"), summaryId);
  assert.deepEqual(freeSource.watermark, { text: "MUSTAWAK.COM", reference: null, traceable: false });
});

test("access is denied before a signed R2 URL is issued", async () => {
  const { state, service } = harness({
    access: {
      allowed: false,
      reason: "paid_access_required",
      effectiveAccessType: "paid",
      accessSource: null,
      codeGrantId: null,
    },
  });
  await assert.rejects(
    service.getSummaryPdfViewerSource(new Request("https://example.test"), summaryId),
    (error) => error.code === "summary_pdf_access_denied" && error.status === 403,
  );
  assert.equal(state.signed, 0);
});

test("public links use the viewer and expose no download or print controls", () => {
  const summary = readFileSync("src/components/public/study-summaries/study-summary-details.tsx", "utf8");
  const chapter = readFileSync("src/components/public/chapter-attachments.tsx", "utf8");
  const review = readFileSync("src/components/public/quiz/review/quiz-review.tsx", "utf8");
  const viewer = readFileSync("src/components/public/pdf-viewer/pdf-viewer.tsx", "utf8");
  assert.match(summary, /\/pdf-viewer\/summary\//);
  assert.match(chapter, /\/pdf-viewer\/chapter\//);
  assert.match(review, /\/pdf-viewer\/summary\//);
  assert.doesNotMatch(viewer, /<Download|window\.print|download=/);
  assert.match(viewer, /data-mustawak-watermark/);
});

test("PDF.js core finishes loading before the viewer module is imported", () => {
  const viewer = readFileSync("src/components/public/pdf-viewer/pdf-viewer.tsx", "utf8");
  const core = viewer.indexOf('const pdfjs = await import("pdfjs-dist/webpack.mjs")');
  const ui = viewer.indexOf('const viewerModule = await import("pdfjs-dist/web/pdf_viewer.mjs")');
  assert.ok(core >= 0 && ui > core);
  assert.doesNotMatch(viewer, /Promise\.all\(\s*\[\s*import\("pdfjs-dist\/webpack\.mjs"\)/);
});

test("PDF viewer starts at 100 percent without resetting zoom on retry", () => {
  const viewer = readFileSync("src/components/public/pdf-viewer/pdf-viewer.tsx", "utf8");
  assert.match(viewer, /const preservedScaleRef = useRef\("1"\)/);
  assert.match(viewer, /preservedScaleRef\.current = viewerRef\.current\?\.currentScaleValue \|\| "1"/);
  assert.match(viewer, /viewer\.currentScaleValue = preservedScaleRef\.current \|\| "1"/);
  assert.doesNotMatch(viewer, /page-width/);
});

test("PDF loading errors remain Arabic and never display raw network or library errors", () => {
  const { PdfViewerResponseError, pdfViewerSourceError, pdfViewerLoadErrorMessage } =
    moduleLoader()("src/lib/public/pdf-viewer-errors.ts");
  assert.equal(pdfViewerSourceError("summary_pdf_access_denied", 403), "لا تملك صلاحية فتح هذا الملف.");
  assert.equal(pdfViewerSourceError("chapter_attachment_access_denied", 403), "يتطلب هذا الملف اشتراكًا فعالًا في المادة.");
  assert.equal(pdfViewerSourceError(undefined, 404), "الملف غير موجود أو لم يعد متاحًا.");

  const known = new PdfViewerResponseError(pdfViewerSourceError("summary_pdf_access_denied", 403));
  assert.equal(pdfViewerLoadErrorMessage(known, "source"), known.message);
  for (const stage of ["source", "viewer", "document"]) {
    const message = pdfViewerLoadErrorMessage(new Error("Failed to fetch: signed-url-secret"), stage);
    assert.match(message, /تعذر/);
    assert.doesNotMatch(message, /Failed to fetch|signed-url-secret/);
  }
});
