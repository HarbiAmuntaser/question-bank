import { prisma } from "@/lib/prisma";
import { json, bad, unauth } from "@/lib/http";
import { verifyAdmin } from "@/lib/admin-auth";
import { revalidateTag } from "next/cache";
import { questionsImportSchema, type ImportItem } from "@/validations/question-import";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return unauth();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("ملف JSON غير صالح");
  }

  const parsed = questionsImportSchema.safeParse(body);
  if (!parsed.success) {
    return bad("validation_error", parsed.error.flatten());
  }

  const { chapterId, items } = parsed.data;

  const exists = await prisma.chapter.findUnique({ where: { id: chapterId }, select: { id: true } });
  if (!exists) return bad("الفصل غير موجود");

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await createOneQuestion(tx, chapterId, item);
      }
    });
  } catch {
    return bad("فشل الاستيراد. تأكد من صحة البيانات.");
  }

  revalidateTag("questions");
  return json({ ok: true, imported: items.length }, { status: 201 });
}

async function createOneQuestion(tx: Prisma.TransactionClient, chapterId: string, item: ImportItem) {
  // نجمع الحقول المشتركة (بدون difficultyLevel, imageUrl, tags)
  const common = {
    chapterId,
    questionText: item.questionText,
    points: item.points ?? 1,
    explanation: item.explanation ?? null,
    isActive: item.isActive ?? true,
    // لا نرسل difficultyLevel, imageUrl, tags إطلاقًا
  } as const;

  if (item.questionType === "multiple_choice") {
    await tx.question.create({
      data: {
        ...common,
        questionType: "multiple_choice",
        options: {
          create: item.options.map((opt, idx) => ({
            optionText: opt.text,
            isCorrect: opt.isCorrect,
            optionOrder: idx + 1,
          })),
        },
      },
    });
    return;
  }

  // true / false
  const correctIsTrue = item.tfAnswer === true;
  await tx.question.create({
    data: {
      ...common,
      questionType: "true_false",
      options: {
        create: [
          { optionText: "True", isCorrect: correctIsTrue, optionOrder: 1 },
          { optionText: "False", isCorrect: !correctIsTrue, optionOrder: 2 },
        ],
      },
    },
  });
}
