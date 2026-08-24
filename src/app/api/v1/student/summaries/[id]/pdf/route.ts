import { CACHE_CONTROL } from "@/lib/cache-tags";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkStudySummaryAccess } from "@/lib/server/access-control";
import { getOrCreateAnonymousSession } from "@/lib/server/anonymous-session";
import { createPresignedGetUrl } from "@/lib/server/storage";
import { isPublicStudySummaryId } from "@/lib/server/public-content-visibility";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function privateHeaders() {
  return new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });
}

function fail(error: string, status: number) {
  return json({ error }, { status, headers: privateHeaders() });
}

function redirectNoStore(location: string) {
  const headers = privateHeaders();
  headers.set("location", location);
  return new Response(null, { status: 302, headers });
}

function pdfContentTypeIsValid(contentType: string | null) {
  if (!contentType) return true;
  return contentType.split(";")[0]?.trim().toLowerCase() === "application/pdf";
}

function safePublicRedirectTarget(url: string | null, storageProvider: string, visibility: string) {
  const value = url?.trim();
  if (!value) return null;

  if (storageProvider === "local") {
    return value.startsWith("/uploads/attachments/") ? value : null;
  }

  if (storageProvider === "external_url" || visibility === "public") {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const summaryId = id?.trim();

  if (!summaryId || !uuidPattern.test(summaryId)) {
    return fail("invalid_summary_id", 400);
  }

  if (!(await isPublicStudySummaryId(summaryId))) {
    return fail("summary_not_found", 404);
  }

  const now = new Date();
  const summary = await prisma.studySummary.findUnique({
    where: { id: summaryId },
    select: {
      id: true,
      status: true,
      publishedAt: true,
      subjectId: true,
      chapterId: true,
      pdfAttachmentId: true,
      pdfAttachment: {
        select: {
          id: true,
          kind: true,
          ownerType: true,
          ownerId: true,
          storageProvider: true,
          visibility: true,
          bucket: true,
          storageKey: true,
          contentType: true,
          url: true,
        },
      },
      subject: { select: { majorId: true } },
      chapter: { select: { id: true } },
    },
  });

  if (!summary || summary.status !== "published" || !summary.publishedAt || summary.publishedAt > now) {
    return fail("summary_not_found", 404);
  }

  if (!summary.pdfAttachmentId || !summary.pdfAttachment) {
    return fail("summary_pdf_not_found", 404);
  }

  const attachment = summary.pdfAttachment;
  const ownerIsValid =
    (attachment.ownerType === "study_summary" && attachment.ownerId === summary.id) ||
    (attachment.ownerType === "subject" && attachment.ownerId === summary.subjectId) ||
    (attachment.ownerType === "chapter" && summary.chapterId && attachment.ownerId === summary.chapterId);

  if (attachment.kind !== "pdf" || !pdfContentTypeIsValid(attachment.contentType) || !ownerIsValid) {
    return fail("invalid_summary_pdf_attachment", 409);
  }

  const { session } = await getOrCreateAnonymousSession();
  const access = await checkStudySummaryAccess({
    summaryId: summary.id,
    anonymousSessionId: session.id,
  });

  if (!access.allowed) {
    return fail("summary_pdf_access_denied", 403);
  }

  if (attachment.storageProvider === "r2" && attachment.visibility === "private") {
    if (!attachment.bucket || !attachment.storageKey) {
      return fail("summary_pdf_storage_unavailable", 409);
    }

    try {
      const signedUrl = await createPresignedGetUrl({
        bucket: attachment.bucket,
        storageKey: attachment.storageKey,
      });
      return redirectNoStore(signedUrl);
    } catch {
      return fail("summary_pdf_storage_unavailable", 409);
    }
  }

  const publicTarget = safePublicRedirectTarget(attachment.url, attachment.storageProvider, attachment.visibility);
  if (publicTarget) {
    return redirectNoStore(publicTarget);
  }

  return fail("summary_pdf_storage_unavailable", 409);
}
