import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { listChaptersQuerySchema } from "@/validations/chapter"
import { listCollegesQuerySchema } from "@/validations/college"
import { listMajorsQuerySchema } from "@/validations/major"
import { listSubjectsQuerySchema } from "@/validations/subject"
import { listQuerySchema as listUniversitiesQuerySchema } from "@/validations/university"

export type AdminListQuery = Record<string, string | null | undefined>

export class AdminListQueryError extends Error {
  constructor() {
    super("bad_query_params")
    this.name = "AdminListQueryError"
  }
}

function invalidQuery(): never {
  throw new AdminListQueryError()
}

export async function listAdminUniversities(q: AdminListQuery) {
  const parsed = listUniversitiesQuerySchema.safeParse({
    page: q.page,
    pageSize: q.pageSize,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    query: q.query ?? "",
  })
  if (!parsed.success) invalidQuery()

  const { page, pageSize, sortBy, sortOrder, query } = parsed.data
  const countryCode = q.countryCode?.trim().toUpperCase()
  const institutionType = q.institutionType?.trim()
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) invalidQuery()
  if (institutionType && !["university", "academy", "school"].includes(institutionType)) invalidQuery()

  const and: Prisma.UniversityWhereInput[] = []
  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { region: { contains: query, mode: "insensitive" } },
      ],
    })
  }
  if (countryCode) and.push({ countryCode })
  if (institutionType) and.push({ institutionType: institutionType as "university" | "academy" | "school" })
  const where: Prisma.UniversityWhereInput = and.length ? { AND: and } : {}

  const [data, total] = await Promise.all([
    prisma.university.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        region: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        countryCode: true,
        institutionType: true,
        visibility: true,
        _count: { select: { majors: true } },
      },
    }),
    prisma.university.count({ where }),
  ])

  return {
    data: data.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}

export async function listAdminColleges(q: AdminListQuery) {
  const parsed = listCollegesQuerySchema.safeParse({
    page: q.page,
    pageSize: q.pageSize,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    query: q.query ?? "",
    universityId: q.universityId ?? undefined,
  })
  if (!parsed.success) invalidQuery()

  const { page, pageSize, sortBy, sortOrder, query, universityId } = parsed.data
  const where: Prisma.CollegeWhereInput = {
    ...(universityId ? { universityId } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
            { university: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.college.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        universityId: true,
        name: true,
        slug: true,
        code: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        university: { select: { id: true, name: true, code: true } },
        _count: { select: { majors: true } },
      },
    }),
    prisma.college.count({ where }),
  ])

  return {
    data: rows.map(({ _count, ...row }) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      majorsCount: _count.majors,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}

export async function listAdminMajors(q: AdminListQuery) {
  const parsed = listMajorsQuerySchema.safeParse({
    page: q.page,
    pageSize: q.pageSize,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    query: q.query ?? "",
    universityId: q.universityId ?? undefined,
    collegeId: q.collegeId ?? undefined,
  })
  if (!parsed.success) invalidQuery()

  const { page, pageSize, sortBy, sortOrder, query, universityId, collegeId } = parsed.data
  const and: Prisma.MajorWhereInput[] = []
  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { university: { OR: [{ name: { contains: query, mode: "insensitive" } }, { code: { contains: query, mode: "insensitive" } }] } },
        { college: { OR: [{ name: { contains: query, mode: "insensitive" } }, { code: { contains: query, mode: "insensitive" } }] } },
      ],
    })
  }
  if (universityId) and.push({ universityId })
  if (collegeId) and.push({ collegeId })
  const where: Prisma.MajorWhereInput = and.length ? { AND: and } : {}

  const [rows, total] = await Promise.all([
    prisma.major.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        code: true,
        degreeType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        universityId: true,
        collegeId: true,
        university: { select: { id: true, name: true, code: true } },
        college: { select: { id: true, name: true, code: true } },
        _count: { select: { subjects: true } },
      },
    }),
    prisma.major.count({ where }),
  ])

  return {
    data: rows.map(({ _count, ...row }) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      subjectsCount: _count.subjects,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}

export async function listAdminSubjects(q: AdminListQuery) {
  const parsed = listSubjectsQuerySchema.safeParse({
    page: q.page,
    pageSize: q.pageSize,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    query: q.query ?? "",
    universityId: q.universityId ?? undefined,
    collegeId: q.collegeId ?? undefined,
    majorId: q.majorId ?? undefined,
  })
  if (!parsed.success) invalidQuery()

  const { page, pageSize, sortBy, sortOrder, query, universityId, collegeId, majorId } = parsed.data
  const and: Prisma.SubjectWhereInput[] = []
  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { major: { OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
          { university: { OR: [{ name: { contains: query, mode: "insensitive" } }, { code: { contains: query, mode: "insensitive" } }] } },
        ] } },
      ],
    })
  }
  if (universityId) and.push({ major: { universityId } })
  if (collegeId) and.push({ major: { collegeId } })
  if (majorId) and.push({ majorId })
  const where: Prisma.SubjectWhereInput = and.length ? { AND: and } : {}

  const [rows, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        code: true,
        creditHours: true,
        semester: true,
        year: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        majorId: true,
        major: {
          select: {
            id: true,
            name: true,
            code: true,
            collegeId: true,
            college: { select: { id: true, name: true, code: true } },
            university: { select: { id: true, name: true, code: true } },
          },
        },
        _count: { select: { chapters: true } },
      },
    }),
    prisma.subject.count({ where }),
  ])

  return {
    data: rows.map(({ _count, ...row }) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      chaptersCount: _count.chapters,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}

export async function listAdminChapters(q: AdminListQuery) {
  const parsed = listChaptersQuerySchema.safeParse({
    page: q.page,
    pageSize: q.pageSize,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    query: q.query ?? "",
    universityId: q.universityId ?? undefined,
    collegeId: q.collegeId ?? undefined,
    majorId: q.majorId ?? undefined,
    subjectId: q.subjectId ?? undefined,
  })
  if (!parsed.success) invalidQuery()

  const { page, pageSize, sortBy, sortOrder, query, universityId, collegeId, majorId, subjectId } = parsed.data
  const and: Prisma.ChapterWhereInput[] = []
  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { subject: { name: { contains: query, mode: "insensitive" } } },
        { subject: { code: { contains: query, mode: "insensitive" } } },
        { subject: { major: { name: { contains: query, mode: "insensitive" } } } },
        { subject: { major: { code: { contains: query, mode: "insensitive" } } } },
        { subject: { major: { university: { name: { contains: query, mode: "insensitive" } } } } },
        { subject: { major: { university: { code: { contains: query, mode: "insensitive" } } } } },
      ],
    })
  }
  if (universityId) and.push({ subject: { major: { universityId } } })
  if (collegeId) and.push({ subject: { major: { collegeId } } })
  if (majorId) and.push({ subject: { majorId } })
  if (subjectId) and.push({ subjectId })
  const where: Prisma.ChapterWhereInput = and.length ? { AND: and } : {}

  const [rows, total] = await Promise.all([
    prisma.chapter.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: sortBy === "chapterNumber" ? [{ chapterNumber: sortOrder }, { name: "asc" }] : { [sortBy]: sortOrder },
      select: {
        id: true,
        subjectId: true,
        name: true,
        slug: true,
        chapterNumber: true,
        description: true,
        learningObjectives: true,
        kind: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            major: {
              select: {
                id: true,
                name: true,
                code: true,
                collegeId: true,
                college: { select: { id: true, name: true, code: true } },
                university: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
        _count: { select: { questions: true } },
      },
    }),
    prisma.chapter.count({ where }),
  ])

  return {
    data: rows.map(({ _count, ...row }) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      questionsCount: _count.questions,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}
