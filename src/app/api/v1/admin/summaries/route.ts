import { Prisma, QuizAccessType, StudySummaryStatus } from "@prisma/client";

import { verifyAdmin } from "@/lib/admin-auth";
import { revalidateStudySummaryCache, type StudySummaryCacheSnapshot } from "@/lib/cache-invalidation";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { encodeSlugPath, stripPrefix } from "@/lib/public/slug-utils";
import { createStudySummarySchema, listStudySummariesQuerySchema } from "@/validations/study-summary";

export const dynamic = "force-dynamic";

function privateHeaders() {
  return new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE });
}

function adminBad(message: string, details?: unknown, status = 400) {
  return json({ error: message, details }, { status, headers: privateHeaders() });
}

function adminUnauth(message = "غير مصرح") {
  return json({ error: message }, { status: 401, headers: privateHeaders() });
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
        : undefined;

  return { contentHtml: html, contentText: text, content };
}

function publishDate(status: StudySummaryStatus, provided?: Date) {
  if (provided) return provided;
  return status === "published" ? new Date() : null;
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
    return { id: row.id, slug: row.slug, subjectId: row.subjectId };
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
  args: { subjectId: string; chapterId?: string | null; summaryId?: string },
) {
  if (!pdfAttachmentId) return { ok: true as const };

  const attachment = await prisma.attachment.findUnique({
    where: { id: pdfAttachmentId },
    select: { id: true, kind: true, ownerType: true, ownerId: true },
  });

  if (!attachment) return { ok: false as const, error: "pdf_attachment_not_found" };
  if (attachment.kind !== "pdf") return { ok: false as const, error: "pdf_attachment_must_be_pdf" };

  const ownerIsValid =
    (attachment.ownerType === "study_summary" && args.summaryId && attachment.ownerId === args.summaryId) ||
    (attachment.ownerType === "subject" && attachment.ownerId === args.subjectId) ||
    (attachment.ownerType === "chapter" && args.chapterId && attachment.ownerId === args.chapterId);

  if (!ownerIsValid) return { ok: false as const, error: "pdf_attachment_owner_mismatch" };
  return { ok: true as const };
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return adminUnauth();

  const url = new URL(req.url);
  const parsed = listStudySummariesQuerySchema.safeParse({
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    query: url.searchParams.get("query"),
    status: url.searchParams.get("status") ?? "all",
    subjectId: url.searchParams.get("subjectId"),
    chapterId: url.searchParams.get("chapterId"),
    sortBy: url.searchParams.get("sortBy"),
    sortOrder: url.searchParams.get("sortOrder"),
  });

  if (!parsed.success) return adminBad("bad_query_params", parsed.error.flatten());

  const { page, pageSize, query, status, subjectId, chapterId, sortBy, sortOrder } = parsed.data;
  const andParts: Prisma.StudySummaryWhereInput[] = [];

  if (query) {
    andParts.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
        { contentText: { contains: query, mode: "insensitive" } },
        { subject: { name: { contains: query, mode: "insensitive" } } },
        { subject: { code: { contains: query, mode: "insensitive" } } },
        { chapter: { name: { contains: query, mode: "insensitive" } } },
      ],
    });
  }

  if (status !== "all") andParts.push({ status: status as StudySummaryStatus });
  if (subjectId) andParts.push({ subjectId });
  if (chapterId) andParts.push({ chapterId });

  const where: Prisma.StudySummaryWhereInput = andParts.length ? { AND: andParts } : {};
  const orderBy = { [sortBy]: sortOrder } as Prisma.StudySummaryOrderByWithRelationInput;

  try {
    const [rows, total] = await Promise.all([
      prisma.studySummary.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: summaryInclude,
      }),
      prisma.studySummary.count({ where }),
    ]);

    return json(
      {
        data: rows.map(serializeSummary),
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      },
      { status: 200, headers: privateHeaders() },
    );
  } catch {
    return adminBad("failed_to_load_study_summaries");
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return adminUnauth();

  const body = await req.json().catch(() => null);
  const parsed = createStudySummarySchema.safeParse(body);
  if (!parsed.success) return adminBad("validation_error", parsed.error.flatten());

  const input = parsed.data;

  if (!(await validateSubject(input.subjectId))) return adminBad("subject_not_found", undefined, 404);

  const chapterCheck = await validateChapter(input.chapterId, input.subjectId);
  if (!chapterCheck.ok) return adminBad(chapterCheck.error);

  const attachmentCheck = await validatePdfAttachment(input.pdfAttachmentId, {
    subjectId: input.subjectId,
    chapterId: input.chapterId,
  });
  if (!attachmentCheck.ok) return adminBad(attachmentCheck.error);

  const content = contentPayload(input.content, input.contentHtml, input.contentText);

  try {
    const created = await prisma.studySummary.create({
      data: {
        subjectId: input.subjectId,
        chapterId: input.chapterId ?? null,
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        content: content.content,
        contentHtml: content.contentHtml,
        contentText: content.contentText,
        pdfAttachmentId: input.pdfAttachmentId ?? null,
        status: input.status as StudySummaryStatus,
        accessType: input.accessType as QuizAccessType,
        publishedAt: publishDate(input.status as StudySummaryStatus, input.publishedAt),
        language: input.language,
        readingMinutes: input.readingMinutes ?? null,
        sortOrder: input.sortOrder,
        isFeatured: input.isFeatured,
        createdBy: auth.userId === "api-key" ? null : auth.userId,
        updatedBy: auth.userId === "api-key" ? null : auth.userId,
      },
      include: summaryInclude,
    });

    revalidateStudySummaryCache({ next: await loadSummaryCacheSnapshot(created.id) });

    return json(
      { data: serializeSummary(created), message: "study_summary_created" },
      { status: 201, headers: privateHeaders() },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return duplicateError();
      if (error.code === "P2003") return adminBad("invalid_study_summary_relation");
    }
    return adminBad("failed_to_create_study_summary");
  }
}
