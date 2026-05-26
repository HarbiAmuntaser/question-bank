import { prisma } from "@/lib/prisma";
import { json, bad, unauth, notFound } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { updateChapterSchema } from "@/validations/chapter";
import { revalidateTag } from "next/cache";

type ChapterUpdateData = {
  name?: string;
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
  return json({ data: c }, { status: 200, headers: { "cache-control": "public, s-maxage=3600" } });
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
  if (typeof p.subjectId !== "undefined") data.subject = { connect: { id: p.subjectId } };
  if (typeof p.isActive !== "undefined") data.isActive = p.isActive;

  if (Object.prototype.hasOwnProperty.call(p, "chapterNumber")) data.chapterNumber = p.chapterNumber ?? null;
  if (Object.prototype.hasOwnProperty.call(p, "description")) data.description = p.description ?? null;
  if (Object.prototype.hasOwnProperty.call(p, "learningObjectives"))
    data.learningObjectives = Array.isArray(p.learningObjectives) ? p.learningObjectives : [];

  const updated = await prisma.chapter.update({ where: { id }, data });
  revalidateTag("chapters");
  return json({ data: updated });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  try {
    await prisma.chapter.delete({ where: { id } });
  } catch {
    return bad("فشل الحذف. تأكد من عدم وجود علاقات (أسئلة مرتبطة)");
  }

  revalidateTag("chapters");
  return json({ data: true });
}
