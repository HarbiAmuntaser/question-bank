"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AdminLookupType = "university" | "major" | "subject" | "chapter";

export type AdminLookupOption = {
  id: string;
  label: string;
  subLabel?: string;
  code?: string | null;
};

function clampLimit(limit?: number) {
  if (!limit || !Number.isFinite(limit)) return 30;
  return Math.max(1, Math.min(50, Math.floor(limit)));
}

function normalizeQuery(query?: string) {
  const q = query?.trim();
  return q && q.length > 0 ? q : undefined;
}

async function assertAdminSession() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["admin", "editor", "moderator"].includes(role)) {
    throw new Error("unauthorized");
  }
}

export async function searchUniversitiesAction(args: { query?: string; limit?: number } = {}) {
  await assertAdminSession();
  const query = normalizeQuery(args.query);
  const take = clampLimit(args.limit);

  const rows = await prisma.university.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { name: "asc" },
    take,
    select: { id: true, name: true, code: true, city: true },
  });

  return rows.map((row): AdminLookupOption => ({
    id: row.id,
    label: row.name,
    code: row.code,
    subLabel: [row.code, row.city].filter(Boolean).join(" - ") || undefined,
  }));
}

export async function searchMajorsAction(args: { universityId?: string; query?: string; limit?: number }) {
  await assertAdminSession();
  if (!args.universityId) return [];
  const query = normalizeQuery(args.query);
  const take = clampLimit(args.limit);

  const rows = await prisma.major.findMany({
    where: {
      universityId: args.universityId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { code: { contains: query, mode: "insensitive" } },
              { degreeType: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take,
    select: {
      id: true,
      name: true,
      code: true,
      degreeType: true,
      university: { select: { name: true, code: true } },
    },
  });

  return rows.map((row): AdminLookupOption => ({
    id: row.id,
    label: row.name,
    code: row.code,
    subLabel: [row.code, row.degreeType, row.university?.name].filter(Boolean).join(" - ") || undefined,
  }));
}

export async function searchSubjectsAction(args: { majorId?: string; query?: string; limit?: number }) {
  await assertAdminSession();
  if (!args.majorId) return [];
  const query = normalizeQuery(args.query);
  const take = clampLimit(args.limit);

  const rows = await prisma.subject.findMany({
    where: {
      majorId: args.majorId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { code: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take,
    select: {
      id: true,
      name: true,
      code: true,
      major: { select: { name: true, university: { select: { name: true } } } },
    },
  });

  return rows.map((row): AdminLookupOption => ({
    id: row.id,
    label: row.name,
    code: row.code,
    subLabel: [row.code, row.major?.name, row.major?.university?.name].filter(Boolean).join(" - ") || undefined,
  }));
}

export async function searchChaptersAction(args: { subjectId?: string; query?: string; limit?: number }) {
  await assertAdminSession();
  if (!args.subjectId) return [];
  const query = normalizeQuery(args.query);
  const take = clampLimit(args.limit);

  const rows = await prisma.chapter.findMany({
    where: {
      subjectId: args.subjectId,
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    orderBy: [{ chapterNumber: "asc" }, { name: "asc" }],
    take,
    select: { id: true, name: true, chapterNumber: true },
  });

  return rows.map((row): AdminLookupOption => ({
    id: row.id,
    label: row.name,
    subLabel: typeof row.chapterNumber === "number" ? `الفصل ${row.chapterNumber}` : undefined,
  }));
}

export async function resolveAdminLookupAction(type: AdminLookupType, id: string) {
  await assertAdminSession();
  if (!id) return null;

  if (type === "university") {
    const row = await prisma.university.findUnique({
      where: { id },
      select: { id: true, name: true, code: true, city: true },
    });
    return row
      ? {
          id: row.id,
          label: row.name,
          code: row.code,
          subLabel: [row.code, row.city].filter(Boolean).join(" - ") || undefined,
        }
      : null;
  }

  if (type === "major") {
    const row = await prisma.major.findUnique({
      where: { id },
      select: { id: true, name: true, code: true, degreeType: true, university: { select: { name: true } } },
    });
    return row
      ? {
          id: row.id,
          label: row.name,
          code: row.code,
          subLabel: [row.code, row.degreeType, row.university?.name].filter(Boolean).join(" - ") || undefined,
        }
      : null;
  }

  if (type === "subject") {
    const row = await prisma.subject.findUnique({
      where: { id },
      select: { id: true, name: true, code: true, major: { select: { name: true } } },
    });
    return row
      ? {
          id: row.id,
          label: row.name,
          code: row.code,
          subLabel: [row.code, row.major?.name].filter(Boolean).join(" - ") || undefined,
        }
      : null;
  }

  const row = await prisma.chapter.findUnique({
    where: { id },
    select: { id: true, name: true, chapterNumber: true },
  });
  return row
    ? {
        id: row.id,
        label: row.name,
        subLabel: typeof row.chapterNumber === "number" ? `الفصل ${row.chapterNumber}` : undefined,
      }
    : null;
}
