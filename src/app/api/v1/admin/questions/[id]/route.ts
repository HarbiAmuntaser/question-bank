import { prisma } from "@/lib/prisma";
import { json, bad, unauth, notFound } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { updateQuestionSchema } from "@/validations/question";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: RouteContext) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const { id } = await params;

  const q = await prisma.question.findUnique({
    where: { id },
    include: {
      chapter: {
        include: {
          subject: {
            include: {
              major: {
                include: {
                  university: true,
                },
              },
            },
          },
        },
      },
      options: { orderBy: { optionOrder: "asc" } },
    },
  });

  if (!q) return notFound("السؤال غير موجود");

  return json(
    { data: q },
    { status: 200, headers: { "cache-control": "public, s-maxage=3600" } }
  );
}

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  const body: unknown = await req.json().catch(() => null);
  const parsed = updateQuestionSchema.safeParse(body);
  if (!parsed.success) return bad("validation_error", parsed.error.flatten());

  const exists = await prisma.question.findUnique({ where: { id } });
  if (!exists) return notFound("السؤال غير موجود");

  const d = parsed.data;

  const incomingType = typeof d.questionType !== "undefined" ? d.questionType : exists.questionType;

  const replaceOptions =
    typeof d.options !== "undefined" ||
    incomingType === "multiple_choice" ||
    incomingType === "true_false";

  if (replaceOptions) {
    await prisma.questionOption.deleteMany({ where: { questionId: id } });
  }

  const updated = await prisma.question.update({
    where: { id },
    data: {
      chapterId: typeof d.chapterId !== "undefined" ? d.chapterId : undefined,
      questionText: typeof d.questionText !== "undefined" ? d.questionText : undefined,
      questionType: typeof d.questionType !== "undefined" ? d.questionType : undefined,
      difficultyLevel: typeof d.difficultyLevel !== "undefined" ? d.difficultyLevel : undefined,
      points: typeof d.points !== "undefined" ? d.points : undefined,
      explanation: Object.prototype.hasOwnProperty.call(d, "explanation") ? d.explanation ?? null : undefined,
      imageUrl: Object.prototype.hasOwnProperty.call(d, "imageUrl") ? d.imageUrl ?? null : undefined,
      tags: typeof d.tags !== "undefined" ? d.tags : undefined,
      isActive: typeof d.isActive !== "undefined" ? d.isActive : undefined,
      options:
        d.options?.length
          ? {
              create: d.options.map((o, idx) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
                optionOrder: o.optionOrder ?? idx + 1,
              })),
            }
          : undefined,
    },
    include: { options: true },
  });

  revalidateTag("questions");
  return json({ data: updated }, { status: 200 });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  try {
    await prisma.question.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return bad("فشل الحذف");
    }
    return bad("فشل الحذف");
  }

  revalidateTag("questions");
  return json({ data: true }, { status: 200 });
}
