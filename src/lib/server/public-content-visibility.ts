import "server-only";

import type { Prisma } from "@prisma/client";

import {
  getEnabledPublicTypes,
  isPublicInstitutionTypeEnabled,
} from "@/config/public-features";
import { prisma } from "@/lib/prisma";

export function publicUniversityWhere(): Prisma.UniversityWhereInput {
  return { institutionType: { in: getEnabledPublicTypes() } };
}

export function publicMajorWhere(): Prisma.MajorWhereInput {
  return { university: publicUniversityWhere() };
}

export function publicSubjectWhere(): Prisma.SubjectWhereInput {
  return { major: publicMajorWhere() };
}

export function publicQuizWhere(): Prisma.QuizWhereInput {
  const universityWhere = publicUniversityWhere();
  const publicQuestionWhere = {
    question: {
      chapter: {
        subject: { major: { university: universityWhere } },
      },
    },
  } satisfies Prisma.QuizQuestionWhereInput;

  return {
    OR: [
      {
        subject: { major: { university: universityWhere } },
        questions: { every: publicQuestionWhere },
      },
      {
        subjectId: null,
        questions: {
          some: publicQuestionWhere,
          every: publicQuestionWhere,
        },
      },
      { subjectId: null, questions: { none: {} } },
    ],
  };
}

export function publicStudySummaryWhere(): Prisma.StudySummaryWhereInput {
  return { subject: publicSubjectWhere() };
}

export function isPublicInstitutionRecord(record: { institutionType?: unknown } | null | undefined) {
  return isPublicInstitutionTypeEnabled(record?.institutionType);
}

export async function isPublicUniversityId(id: string) {
  const row = await prisma.university.findFirst({
    where: { id, ...publicUniversityWhere() },
    select: { id: true },
  });
  return Boolean(row);
}

export async function isPublicMajorId(id: string) {
  const row = await prisma.major.findFirst({
    where: { id, ...publicMajorWhere() },
    select: { id: true },
  });
  return Boolean(row);
}

export async function isPublicSubjectId(id: string) {
  const row = await prisma.subject.findFirst({
    where: { id, ...publicSubjectWhere() },
    select: { id: true },
  });
  return Boolean(row);
}

export async function isPublicQuizId(id: string) {
  const row = await prisma.quiz.findFirst({
    where: { id, ...publicQuizWhere() },
    select: { id: true },
  });
  return Boolean(row);
}

export async function isPublicStudySummaryId(id: string) {
  const row = await prisma.studySummary.findFirst({
    where: { id, ...publicStudySummaryWhere() },
    select: { id: true },
  });
  return Boolean(row);
}

export async function getPublicQuizIdSet(ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await prisma.quiz.findMany({
    where: { id: { in: ids }, ...publicQuizWhere() },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

export async function getPublicStudySummaryIdSet(ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await prisma.studySummary.findMany({
    where: { id: { in: ids }, ...publicStudySummaryWhere() },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}
