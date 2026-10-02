import { CACHE_CONTROL } from "@/lib/cache-tags";
import { readChapterAttachmentPurpose } from "@/lib/chapter-attachments";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkScopeAccess } from "@/lib/server/access-control";
import { guestAccessTokenFromRequest } from "@/lib/server/code-access-cookie";
import { publishedSubjectWhere } from "@/lib/server/payment-scope";
import { createPresignedGetUrl } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ chapterId: string; attachmentId: string }> };

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

export async function GET(request: Request, context: Ctx) {
  const { chapterId, attachmentId } = await context.params;
  if (!uuidPattern.test(chapterId) || !uuidPattern.test(attachmentId)) {
    return fail("invalid_chapter_attachment_id", 400);
  }

  const [chapter, attachment] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        id: chapterId,
        isActive: true,
        subject: publishedSubjectWhere(),
      },
      select: { id: true, subjectId: true },
    }),
    prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ownerType: "chapter",
        ownerId: chapterId,
        kind: "pdf",
        storageProvider: "r2",
        visibility: "private",
        contentType: "application/pdf",
      },
      select: {
        bucket: true,
        storageKey: true,
        meta: true,
      },
    }),
  ]);

  if (!chapter || !attachment || !readChapterAttachmentPurpose(attachment.meta)) {
    return fail("chapter_attachment_not_found", 404);
  }
  if (!attachment.bucket || !attachment.storageKey) {
    return fail("chapter_attachment_storage_unavailable", 409);
  }

  const access = await checkScopeAccess({
    subjectId: chapter.subjectId,
    guestSessionToken: guestAccessTokenFromRequest(request),
  });
  if (!access.allowed) {
    return fail("chapter_attachment_access_denied", 403);
  }

  try {
    const signedUrl = await createPresignedGetUrl({
      bucket: attachment.bucket,
      storageKey: attachment.storageKey,
    });
    return redirectNoStore(signedUrl);
  } catch {
    return fail("chapter_attachment_storage_unavailable", 409);
  }
}
