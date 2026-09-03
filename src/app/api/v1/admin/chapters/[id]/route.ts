import { prisma } from "@/lib/prisma";
import { json, bad, unauth, notFound } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { CACHE_CONTROL } from "@/lib/cache-tags";
import { revalidateChapterCache } from "@/lib/cache-invalidation";
import { updateChapterSchema } from "@/validations/chapter";
import { buildChapterSlug, normalizeChapterSlug } from "@/lib/chapter-slugs";

type ChapterUpdateData = {
  name?: string;
  slug?: string;
  subject?: { connect: { id: string } };
  isActive?: boolean;
  chapterNumber?: number | null;
  description?: string | null;
  learningObjectives?: string[];
};

// قراءة فصل واحد (مع العلاقات)
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await context.params;

  const c = await prisma.chapter.findUnique({
    where: { id },
    include: {
      subject: {
        include: {
          major: {
            include: {
              university: { select: { id: true, name: true, code: true } },
            },
          },
        },
      },
      _count: { select: { questions: true } },
      questions: {
        select: { id: true },
      },
    },
  });

  if (!c) return notFound("الفصل غير موجود");
  return json({ data: c }, { status: 200, headers: { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE } });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = updateChapterSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const exists = await prisma.chapter.findUnique({ where: { id } });
  if (!exists) return notFound("الفصل غير موجود");

  const p = parsed.data;
  const data: ChapterUpdateData = {};

  if (typeof p.name !== "undefined") data.name = p.name;
  if (Object.prototype.hasOwnProperty.call(p, "slug") || (typeof p.name !== "undefined" && !exists.slug)) {
    const slug = normalizeChapterSlug(p.slug || "") || buildChapterSlug(p.name ?? exists.name, p.chapterNumber ?? exists.chapterNumber);
    const duplicate = await prisma.chapter.findFirst({
      where: { subjectId: p.subjectId ?? exists.subjectId, slug, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) return bad("chapter_slug_already_exists");
    data.slug = slug;
  }
  if (typeof p.subjectId !== "undefined") data.subject = { connect: { id: p.subjectId } };
  if (typeof p.isActive !== "undefined") data.isActive = p.isActive;

  if (Object.prototype.hasOwnProperty.call(p, "chapterNumber")) data.chapterNumber = p.chapterNumber ?? null;
  if (Object.prototype.hasOwnProperty.call(p, "description")) data.description = p.description ?? null;
  if (Object.prototype.hasOwnProperty.call(p, "learningObjectives"))
    data.learningObjectives = Array.isArray(p.learningObjectives) ? p.learningObjectives : [];

  const updated = await prisma.$transaction(async (tx) => {
    const chapter = await tx.chapter.update({ where: { id }, data });
    const chapterSlug = chapter.slug?.trim();

    if (chapterSlug) {
      await tx.seoMeta.updateMany({
        where: { ownerType: "chapter", ownerId: chapter.id },
        data: { slug: chapterSlug },
      });
    }

    return chapter;
  });
  revalidateChapterCache({ id: updated.id, subjectId: updated.subjectId, previousSubjectId: exists.subjectId });
  return json({ data: updated });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const target = await prisma.chapter.findUnique({
    where: { id },
    select: { subjectId: true },
  });

  try {
    await prisma.chapter.delete({ where: { id } });
  } catch {
    return bad("فشل الحذف. تأكد من عدم وجود علاقات (أسئلة مرتبطة)");
  }

  revalidateChapterCache({ id, subjectId: target?.subjectId });
  return json({ data: true });
}
