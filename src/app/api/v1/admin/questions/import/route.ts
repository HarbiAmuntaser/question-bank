import { revalidateQuestionCache } from "@/lib/cache-invalidation";
import type { Prisma } from "@prisma/client";

import { verifyAdmin } from "@/lib/admin-auth";
import { bad, json, unauth } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { questionsImportSchema, type ImportItem } from "@/validations/question-import";

export const dynamic = "force-dynamic";

type DuplicateStrategy = "allow" | "skip" | "fail";

function questionKey(text: string) {
  return text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function duplicateDetails(items: ImportItem[], existingKeys: Set<string>) {
  const seen = new Map<string, number>();
  const duplicates: Array<{ index: number; firstIndex?: number; source: "existing" | "batch"; questionText: string }> = [];

  items.forEach((item, index) => {
    const key = questionKey(item.questionText);
    const firstIndex = seen.get(key);
    if (existingKeys.has(key)) {
      duplicates.push({ index: index + 1, source: "existing", questionText: item.questionText });
    } else if (firstIndex !== undefined) {
      duplicates.push({ index: index + 1, firstIndex, source: "batch", questionText: item.questionText });
    }
    if (firstIndex === undefined) seen.set(key, index + 1);
  });

  return duplicates;
}

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

  const { chapterId, items, duplicateStrategy } = parsed.data;

  const exists = await prisma.chapter.findUnique({ where: { id: chapterId }, select: { id: true, subjectId: true } });
  if (!exists) return bad("الفصل غير موجود");

  const existingQuestions = await prisma.question.findMany({
    where: { chapterId },
    select: { questionText: true },
  });
  const existingKeys = new Set(existingQuestions.map((question) => questionKey(question.questionText)));

  if (duplicateStrategy === "fail") {
    const duplicates = duplicateDetails(items, existingKeys);
    if (duplicates.length) {
      return bad("duplicate_questions", { total: duplicates.length, duplicates: duplicates.slice(0, 20) });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return importQuestions(tx, chapterId, items, duplicateStrategy, existingKeys);
    });

    if (result.imported > 0) revalidateQuestionCache({ chapterId: exists.id, subjectId: exists.subjectId });
    return json({ ok: true, imported: result.imported, skipped: result.skipped, total: items.length }, { status: 201 });
  } catch {
    return bad("فشل الاستيراد. تأكد من صحة البيانات.");
  }
}

async function importQuestions(
  tx: Prisma.TransactionClient,
  chapterId: string,
  items: ImportItem[],
  duplicateStrategy: DuplicateStrategy,
  existingKeys: Set<string>,
) {
  let imported = 0;
  let skipped = 0;
  const seenInBatch = new Set<string>();

  for (const item of items) {
    const key = questionKey(item.questionText);
    const duplicate = existingKeys.has(key) || seenInBatch.has(key);

    if (duplicate && duplicateStrategy === "skip") {
      skipped += 1;
      continue;
    }

    await createOneQuestion(tx, chapterId, item);
    imported += 1;
    seenInBatch.add(key);
    existingKeys.add(key);
  }

  return { imported, skipped };
}

async function createOneQuestion(tx: Prisma.TransactionClient, chapterId: string, item: ImportItem) {
  // Keep imported metadata aligned with the manual question form.
  const common = {
    chapterId,
    questionText: item.questionText,
    questionType: item.questionType,
    difficultyLevel: item.difficultyLevel ?? "medium",
    points: item.points ?? 1,
    explanation: item.explanation ?? null,
    imageUrl: item.imageUrl ?? null,
    tags: item.tags ?? [],
    isActive: item.isActive ?? true,
  } as const;

  if (item.questionType === "multiple_choice") {
    await tx.question.create({
      data: {
        ...common,
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

  const correctIsTrue = item.tfAnswer === true;
  await tx.question.create({
    data: {
      ...common,
      options: {
        create: [
          { optionText: "True", isCorrect: correctIsTrue, optionOrder: 1 },
          { optionText: "False", isCorrect: !correctIsTrue, optionOrder: 2 },
        ],
      },
    },
  });
}
