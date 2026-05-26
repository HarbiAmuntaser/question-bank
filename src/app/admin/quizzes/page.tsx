import { Suspense } from "react";
import type { Prisma } from "@prisma/client";

import { QuizzesFilters } from "@/components/admin/quizzes/QuizzesFilters";
import QuizzesTable from "@/components/admin/quizzes/QuizzesTable";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { prisma } from "@/lib/prisma";
import { listQuizzesQuerySchema } from "@/validations/quiz";

type SearchParams = Record<string, string | string[] | undefined>;

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getInitialQuizzes(searchParams: SearchParams) {
  const parsed = listQuizzesQuerySchema.safeParse({
    page: getFirst(searchParams.page),
    pageSize: getFirst(searchParams.pageSize),
    sortBy: getFirst(searchParams.sortBy),
    sortOrder: getFirst(searchParams.sortOrder),
    universityId: getFirst(searchParams.universityId),
    majorId: getFirst(searchParams.majorId),
    subjectId: getFirst(searchParams.subjectId),
  });

  const { page, pageSize, sortBy, sortOrder, universityId, majorId, subjectId } = parsed.success
    ? parsed.data
    : listQuizzesQuerySchema.parse({});

  const andFilters: Prisma.QuizWhereInput[] = [];
  if (universityId) {
    andFilters.push({
      questions: {
        some: { question: { chapter: { subject: { major: { universityId } } } } },
      },
    });
  }
  if (majorId) {
    andFilters.push({
      questions: {
        some: { question: { chapter: { subject: { majorId } } } },
      },
    });
  }
  if (subjectId) {
    andFilters.push({
      questions: {
        some: { question: { chapter: { subjectId } } },
      },
    });
  }

  const where: Prisma.QuizWhereInput = andFilters.length ? { AND: andFilters } : {};

  const [rows, total] = await Promise.all([
    prisma.quiz.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
    }),
    prisma.quiz.count({ where }),
  ]);

  // Hydrated client tables receive plain dates, avoiding a follow-up list fetch on first paint.
  return {
    rows: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export default async function QuizzesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const initialData = await getInitialQuizzes(sp);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الاختبارات المنشأة</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">عرض وإدارة الاختبارات التي تم إنشاؤها</p>
      </div>

      <QuizzesFilters />

      <Suspense fallback={<TableSkeleton />}>
        <QuizzesTable initialData={initialData} />
      </Suspense>
    </div>
  );
}
