// src/app/api/v1/admin/exams/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { unstable_cache, revalidateTag } from "next/cache";
import { updateExamPaperSchema } from "@/validations/exam";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// ====== GET /api/v1/admin/exams/[id]  (تفاصيل ورقة + العلاقات) ======
const getExamCached = unstable_cache(
  async (id: string) => {
    const exam = await prisma.examPaper.findUnique({
      where: { id },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            major: {
              select: {
                id: true,
                name: true,
                university: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
        // أسئلة الورقة عبر جدول ExamQuestion بالترتيب:
        questions: {
          orderBy: { questionNumber: "asc" },
          include: {
            question: {
              include: {
                options: { orderBy: { optionOrder: "asc" } },
                chapter: {
                  select: {
                    id: true,
                    name: true,
                    subject: {
                      select: {
                        id: true,
                        name: true,
                        major: {
                          select: {
                            id: true,
                            name: true,
                            university: { select: { id: true, name: true, code: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!exam) return null;

    // المرفقات (ملكية متعددة الأشكال) — لا توجد علاقة مباشرة، نجلبها باستعلام منفصل:
    const attachments = await prisma.attachment.findMany({
      where: { ownerType: "exam" as never, ownerId: id },
      orderBy: { createdAt: "desc" },
    });

    const seoMeta = await prisma.seoMeta.findMany({
      where: { ownerType: "exam" as never, ownerId: id },
      orderBy: { updatedAt: "desc" },
    });

    return { ...exam, attachments, seoMeta };
  },
  // مفتاح الكاش
  ["admin-exam-detail"],
  { revalidate: 3600, tags: ["exams"] }
);

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;
  if (!id) return bad("missing_id");

  try {
    const data = await getExamCached(id);
    if (!data) return bad("not_found", undefined, 404);
    return json({ data }, 200);
  } catch {
    return bad("failed_to_load_exam");
  }
}

// ====== PUT /api/v1/admin/exams/[id]  (تعديل) ======
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;
  if (!id) return bad("missing_id");

  const body = await req.json().catch(() => null);
  const parsed = updateExamPaperSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const s = parsed.data;

  try {
    const updated = await prisma.examPaper.update({
      where: { id },
      data: {
        // subjectId: s.subjectId ?? undefined, // إن رغبت بالسماح بتغيير المقرر فعّل هذا السطر
        year: s.year ?? undefined,
        term: s.term ?? undefined,
        session: s.session ?? undefined,
        code: s.code ?? null,
        source: s.source ?? null,
        fileUrl: s.fileUrl ?? null,
        pagesCount: s.pagesCount ?? null,
        isPublished: s.isPublished ?? undefined,
        language: s.language ?? undefined,
      },
    });

    // إبطال كاش القوائم + التفاصيل
    revalidateTag("exams");
    return json({ data: updated, message: "تم تحديث ورقة الاختبار بنجاح" }, 200);
  } catch (e: any) {
    // قد يحدث تعارض في القيد الفريد (year/term/session/code لنفس المقرر)
    return bad("update_failed", e?.message);
  }
}

// ====== DELETE /api/v1/admin/exams/[id]  (حذف) ======
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await ctx.params;
  if (!id) return bad("missing_id");

  try {
    // الحذف سيحذف روابط ExamQuestion تلقائيًا بسبب onDelete: Cascade
    await prisma.examPaper.delete({ where: { id } });
    revalidateTag("exams");
    return json({ message: "تم حذف ورقة الاختبار بنجاح" }, 200);
  } catch (e: any) {
    return bad("delete_failed", e?.message);
  }
}
