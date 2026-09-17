import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function outOfPaymentQuizIds(ids: string[]) {
  if (!ids.length) return new Set<string>();
  const outside = { major: { university: { NOT: { countryCode: "SA", institutionType: "university" } } } } satisfies Prisma.SubjectWhereInput;
  const rows = await prisma.quiz.findMany({ where: { id: { in: ids }, AND: [
    { OR: [{ subjectId: null }, { subject: outside }] },
    { questions: { every: { question: { chapter: { subject: outside } } } } },
    { OR: [{ subjectId: { not: null } }, { questions: { some: {} } }] },
  ] }, select: { id: true } });
  return new Set(rows.map((row) => row.id));
}
