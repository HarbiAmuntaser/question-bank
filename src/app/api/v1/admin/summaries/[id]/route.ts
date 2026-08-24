import { Prisma, QuizAccessType, StudySummaryStatus } from "@prisma/client";

import { verifyAdmin } from "@/lib/admin-auth";
import { revalidateStudySummaryCache, type StudySummaryCacheSnapshot } from "@/lib/cache-invalidation";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { encodeSlugPath, stripPrefix } from "@/lib/public/slug-utils";
import { updateStudySummarySchema } from "@/validations/study-summary";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function privateHeaders() {
  return new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });
}

function adminBad(message: string, details?: unknown, status = 400) {
  return json({ error: message, details }, { status, headers: privateHeaders() });
}

function adminUnauth(message = "غير مصرح") {
  return json({ error: message }, { status: 401, headers: privateHeaders() });
}

function adminNotFound(message = "غير موجود") {
  return json({ error: message }, { status: 404, headers: privateHeaders() });
}

const summaryInclude = {
  subject: {
    select: {
      id: true,
      name: true,
      code: true,
      major: {
        select: {
          id: true,
          name: true,
          code: true,
          university: { select: { id: true, name: true, code: true } },
        },
      },
    },
  },
  chapter: { select: { id: true, name: true, chapterNumber: true, subjectId: true } },
  pdfAttachment: {
    select: {
      id: true,
      url: true,
      title: true,
      kind: true,
      ownerType: true,
      ownerId: true,
      storageProvider: true,
      visibility: true,
      contentType: true,
      sizeBytes: true,
      originalName: true,
      createdAt: true,
    },
  },
} satisfies Prisma.StudySummaryInclude;

type SummaryWithRelations = Prisma.StudySummaryGetPayload<{ include: typeof summaryInclude }>;

const summaryRouteSelect = {
  id: true,
  slug: true,
  subjectId: true,
  chapterId: true,
  subject: {
    select: {
      id: true,
      code: true,
      major: {
        select: {
          id: true,
          code: true,
          university: {
            select: {
              id: true,
              code: true,
              countryCode: true,
              institutionType: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.StudySummarySelect;

type SummaryRouteRecord = Prisma.StudySummaryGetPayload<{ select: typeof summaryRouteSelect }>;

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function contentPayload(
  providedContent: unknown,
  contentHtml: string | null | undefined,
  contentText: string | null | undefined,
) {
  const html = contentHtml?.trim() || null;
  const text = contentText?.trim() || (html ? stripHtml(html) : null);
  const content =
    typeof providedContent !== "undefined"
      ? (providedContent as Prisma.InputJsonValue)
      : html || text
        ? ({ type: html ? "html" : "text", value: html ?? text ?? "" } satisfies Prisma.InputJsonObject)
        : Prisma.JsonNull;

  return { contentHtml: html, contentText: text, content };
}

function duplicateError() {
  return adminBad("duplicate_study_summary_slug", { fields: ["subjectId", "slug", "language"] }, 409);
}

function serializeSummary(summary: SummaryWithRelations) {
  return {
    id: summary.id,
    subjectId: summary.subjectId,
    chapterId: summary.chapterId,
    title: summary.title,
    slug: summary.slug,
    excerpt: summary.excerpt,
    content: summary.content,
    contentHtml: summary.contentHtml,
    contentText: summary.contentText,
    pdfAttachmentId: summary.pdfAttachmentId,
    status: summary.status,
    accessType: summary.accessType,
    publishedAt: summary.publishedAt,
    language: summary.language,
    readingMinutes: summary.readingMinutes,
    sortOrder: summary.sortOrder,
    isFeatured: summary.isFeatured,
    subject: summary.subject,
    chapter: summary.chapter,
    pdfAttachment: summary.pdfAttachment,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

async function routeSlug(ownerType: "university" | "major" | "subject", ownerId: string, fallback: string | null, prefix: string) {
  const seo = await prisma.seoMeta.findFirst({
    where: { ownerType, ownerId, locale: "ar", noindex: false },
    select: { slug: true },
  });
  return stripPrefix(seo?.slug || fallback || ownerId, prefix);
}

async function toCacheSnapshot(row: SummaryRouteRecord | null): Promise<StudySummaryCacheSnapshot | null> {
  if (!row) return null;

  const university = row.subject.major.university;
  const countryCode = (university.countryCode || "").trim().toUpperCase();
  const institutionType = (university.institutionType || "").trim().toLowerCase();

  if (!countryCode || !institutionType) {
    return { id: row.id, slug: row.slug, subjectId: row.subjectId, chapterId: row.chapterId };
  }

  const [universitySlug, majorSlug, subjectSlug] = await Promise.all([
    routeSlug("university", university.id, university.code, "جامعات"),
    routeSlug("major", row.subject.major.id, row.subject.major.code, "تخصصات"),
    routeSlug("subject", row.subject.id, row.subject.code, "مواد"),
  ]);
  const summarySlug = stripPrefix(row.slug, "ملخصات");
  const subjectPath = `/${countryCode}/${institutionType}/universities/${encodeSlugPath(universitySlug)}/majors/${encodeSlugPath(
    majorSlug,
  )}/subjects/${encodeSlugPath(subjectSlug)}`;

  return {
    id: row.id,
    slug: row.slug,
    subjectId: row.subjectId,
    chapterId: row.chapterId,
    subjectPath,
    summaryPath: `${subjectPath}/summaries/${encodeSlugPath(summarySlug)}`,
  };
}

async function loadSummaryCacheSnapshot(id: string) {
  const row = await prisma.studySummary.findUnique({ where: { id }, select: summaryRouteSelect });
  return toCacheSnapshot(row);
}

async function validateSubject(subjectId: string) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
  return Boolean(subject);
}

async function validateChapter(chapterId: string | null | undefined, subjectId: string) {
  if (!chapterId) return { ok: true as const };

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, subjectId: true },
  });

  if (!chapter) return { ok: false as const, error: "chapter_not_found" };
  if (chapter.subjectId !== subjectId) return { ok: false as const, error: "chapter_subject_mismatch" };
  return { ok: true as const };
}

async function validatePdfAttachment(
  pdfAttachmentId: string | null | undefined,
  args: { summaryId: string; subjectId: string; chapterId?: string | null },
) {
  if (!pdfAttachmentId) return { ok: true as const };

  const attachment = await prisma.attachment.findUnique({
    where: { id: pdfAttachmentId },
    select: { id: true, kind: true, ownerType: true, ownerId: true },
  });

  if (!attachment) return { ok: false as const, error: "pdf_attachment_not_found" };
  if (attachment.kind !== "pdf") return { ok: false as const, error: "pdf_attachment_must_be_pdf" };

  const ownerIsValid =
    (attachment.ownerType === "study_summary" && attachment.ownerId === args.summaryId) ||
    (attachment.ownerType === "subject" && attachment.ownerId === args.subjectId) ||
    (attachment.ownerType === "chapter" && args.chapterId && attachment.ownerId === args.chapterId);

  if (!ownerIsValid) return { ok: false as const, error: "pdf_attachment_owner_mismatch" };
  return { ok: true as const };
}

export async function GET(req: Request, ctx: Ctx) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return adminUnauth();

  const { id } = await ctx.params;
  const summary = await prisma.studySummary.findUnique({
    where: { id },
    include: summaryInclude,
  });

  if (!summary) return adminNotFound("study_summary_not_found");

  return json({ data: serializeSummary(summary) }, { status: 200, headers: privateHeaders() });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return adminUnauth();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = updateStudySummarySchema.safeParse(body);
  if (!parsed.success) return adminBad("validation_error", parsed.error.flatten());

  const input = parsed.data;

  try {
    const existing = await prisma.studySummary.findUnique({
      where: { id },
      select: {
        id: true,
        subjectId: true,
        chapterId: true,
        contentHtml: true,
        contentText: true,
        pdfAttachmentId: true,
        publishedAt: true,
      },
    });

    if (!existing) return adminNotFound("study_summary_not_found");

    const previousCacheSnapshot = await loadSummaryCacheSnapshot(id);
    const nextSubjectId = input.subjectId ?? existing.subjectId;
    const nextChapterId = typeof input.chapterId !== "undefined" ? input.chapterId : existing.chapterId;
    const nextPdfAttachmentId =
      typeof input.pdfAttachmentId !== "undefined" ? input.pdfAttachmentId : existing.pdfAttachmentId;
    const nextContentHtml = typeof input.contentHtml !== "undefined" ? input.contentHtml : existing.contentHtml;
    const nextContentText = typeof input.contentText !== "undefined" ? input.contentText : existing.contentText;

    if (!(await validateSubject(nextSubjectId))) return adminBad("subject_not_found", undefined, 404);

    const chapterCheck = await validateChapter(nextChapterId, nextSubjectId);
    if (!chapterCheck.ok) return adminBad(chapterCheck.error);

    const attachmentCheck = await validatePdfAttachment(nextPdfAttachmentId, {
      summaryId: id,
      subjectId: nextSubjectId,
      chapterId: nextChapterId,
    });
    if (!attachmentCheck.ok) return adminBad(attachmentCheck.error);

    if (!nextContentHtml?.trim() && !nextContentText?.trim() && !nextPdfAttachmentId) {
      return adminBad("study_summary_content_required");
    }

    const shouldUpdateContent =
      typeof input.content !== "undefined" ||
      typeof input.contentHtml !== "undefined" ||
      typeof input.contentText !== "undefined";
    const content = shouldUpdateContent ? contentPayload(input.content, nextContentHtml, nextContentText) : null;

    const data: Prisma.StudySummaryUpdateInput = {
      ...(typeof input.subjectId !== "undefined" ? { subject: { connect: { id: nextSubjectId } } } : {}),
      ...(typeof input.chapterId !== "undefined"
        ? { chapter: nextChapterId ? { connect: { id: nextChapterId } } : { disconnect: true } }
        : {}),
      ...(typeof input.title !== "undefined" ? { title: input.title } : {}),
      ...(typeof input.slug !== "undefined" ? { slug: input.slug } : {}),
      ...(typeof input.excerpt !== "undefined" ? { excerpt: input.excerpt } : {}),
      ...(typeof input.status !== "undefined" ? { status: input.status as StudySummaryStatus } : {}),
      ...(typeof input.accessType !== "undefined" ? { accessType: input.accessType as QuizAccessType } : {}),
      ...(typeof input.publishedAt !== "undefined" ? { publishedAt: input.publishedAt } : {}),
      ...(input.status === "published" && !existing.publishedAt && typeof input.publishedAt === "undefined"
        ? { publishedAt: new Date() }
        : {}),
      ...(typeof input.language !== "undefined" ? { language: input.language } : {}),
      ...(typeof input.readingMinutes !== "undefined" ? { readingMinutes: input.readingMinutes ?? null } : {}),
      ...(typeof input.sortOrder !== "undefined" ? { sortOrder: input.sortOrder } : {}),
      ...(typeof input.isFeatured !== "undefined" ? { isFeatured: input.isFeatured } : {}),
      ...(typeof input.pdfAttachmentId !== "undefined"
        ? { pdfAttachment: nextPdfAttachmentId ? { connect: { id: nextPdfAttachmentId } } : { disconnect: true } }
        : {}),
      ...(content
        ? {
            content: content.content,
            contentHtml: content.contentHtml,
            contentText: content.contentText,
          }
        : {}),
      ...(auth.userId !== "api-key" ? { updatedBy: auth.userId } : {}),
    };

    const updated = await prisma.studySummary.update({
      where: { id },
      data,
      include: summaryInclude,
    });

    try {
      revalidateStudySummaryCache({
        previous: previousCacheSnapshot,
        next: await loadSummaryCacheSnapshot(updated.id),
      });
    } catch (error) {
      console.error("failed_to_revalidate_study_summary_cache", error instanceof Error ? error.message : "unknown_error");
    }

    return json(
      { data: serializeSummary(updated), message: "study_summary_updated" },
      { status: 200, headers: privateHeaders() },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return adminNotFound("study_summary_not_found");
      if (error.code === "P2002") return duplicateError();
      if (error.code === "P2003") return adminBad("invalid_study_summary_relation");
    }
    return adminBad("failed_to_update_study_summary");
  }
}
