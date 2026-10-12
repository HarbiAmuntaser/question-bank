import "server-only"

import { BlogPostStatus, Prisma, StudySummaryStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import type { AdminListQuery } from "@/lib/server/admin-content-lists"
import { listBlogPostsQuerySchema, listBlogTaxonomyQuerySchema } from "@/validations/blog"
import { listQuestionsQuerySchema } from "@/validations/question"
import { listStudySummariesQuerySchema } from "@/validations/study-summary"

function invalidQuery(): never {
  throw new Error("bad_query_params")
}

export async function listAdminQuestions(q: AdminListQuery) {
  const parsed = listQuestionsQuerySchema.safeParse({
    page: q.page,
    pageSize: q.pageSize,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    query: q.query ?? "",
    universityId: q.universityId ?? undefined,
    collegeId: q.collegeId ?? undefined,
    majorId: q.majorId ?? undefined,
    subjectId: q.subjectId ?? undefined,
    chapterId: q.chapterId ?? undefined,
  })
  if (!parsed.success) invalidQuery()

  const { page, pageSize, sortBy, sortOrder, query, universityId, collegeId, majorId, subjectId, chapterId } = parsed.data
  const and: Prisma.QuestionWhereInput[] = []
  if (query) {
    and.push({
      OR: [
        { questionText: { contains: query, mode: "insensitive" } },
        { explanation: { contains: query, mode: "insensitive" } },
        { chapter: { name: { contains: query, mode: "insensitive" } } },
        { chapter: { subject: { name: { contains: query, mode: "insensitive" } } } },
      ],
    })
  }
  if (universityId) and.push({ chapter: { subject: { major: { universityId } } } })
  if (collegeId) and.push({ chapter: { subject: { major: { collegeId } } } })
  if (majorId) and.push({ chapter: { subject: { majorId } } })
  if (subjectId) and.push({ chapter: { subjectId } })
  if (chapterId) and.push({ chapterId })
  const where: Prisma.QuestionWhereInput = and.length ? { AND: and } : {}
  const orderBy: Prisma.QuestionOrderByWithRelationInput | Prisma.QuestionOrderByWithRelationInput[] =
    sortBy === "difficultyLevel"
      ? [{ difficultyLevel: sortOrder }, { createdAt: "desc" }]
      : { [sortBy]: sortOrder }

  const [rows, total] = await Promise.all([
    prisma.question.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      select: {
        id: true,
        chapterId: true,
        questionText: true,
        questionType: true,
        difficultyLevel: true,
        points: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tags: true,
        chapter: {
          select: {
            id: true,
            name: true,
            chapterNumber: true,
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
                    university: { select: { id: true, name: true, code: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.question.count({ where }),
  ])

  return {
    data: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}

const summaryInclude = {
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
  chapter: { select: { id: true, name: true, chapterNumber: true, subjectId: true } },
  pdfAttachment: {
    select: {
      id: true,
      url: true,
      title: true,
      kind: true,
      ownerType: true,
      ownerId: true,
      storageProvider: true,
      visibility: true,
      contentType: true,
      sizeBytes: true,
      originalName: true,
      createdAt: true,
    },
  },
  _count: { select: { reviewQuestions: { where: { reviewPage: { not: null } } } } },
} satisfies Prisma.StudySummaryInclude

export async function listAdminSummaries(q: AdminListQuery) {
  const parsed = listStudySummariesQuerySchema.safeParse({
    page: q.page,
    pageSize: q.pageSize,
    query: q.query,
    status: q.status ?? "all",
    universityId: q.universityId,
    collegeId: q.collegeId,
    majorId: q.majorId,
    subjectId: q.subjectId,
    chapterId: q.chapterId,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
  })
  if (!parsed.success) invalidQuery()

  const { page, pageSize, query, status, universityId, collegeId, majorId, subjectId, chapterId, sortBy, sortOrder } = parsed.data
  const and: Prisma.StudySummaryWhereInput[] = []
  if (query) {
    and.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
        { contentText: { contains: query, mode: "insensitive" } },
        { subject: { name: { contains: query, mode: "insensitive" } } },
        { subject: { code: { contains: query, mode: "insensitive" } } },
        { chapter: { name: { contains: query, mode: "insensitive" } } },
      ],
    })
  }
  if (status !== "all") and.push({ status: status as StudySummaryStatus })
  if (universityId) and.push({ subject: { major: { universityId } } })
  if (collegeId) and.push({ subject: { major: { collegeId } } })
  if (majorId) and.push({ subject: { majorId } })
  if (subjectId) and.push({ subjectId })
  if (chapterId) and.push({ chapterId })
  const where: Prisma.StudySummaryWhereInput = and.length ? { AND: and } : {}

  const [rows, total] = await Promise.all([
    prisma.studySummary.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder } as Prisma.StudySummaryOrderByWithRelationInput,
      include: summaryInclude,
    }),
    prisma.studySummary.count({ where }),
  ])

  return {
    data: rows.map((summary) => ({
      id: summary.id,
      subjectId: summary.subjectId,
      chapterId: summary.chapterId,
      title: summary.title,
      slug: summary.slug,
      excerpt: summary.excerpt,
      content: summary.content,
      contentHtml: summary.contentHtml,
      contentText: summary.contentText,
      pdfAttachmentId: summary.pdfAttachmentId,
      status: summary.status,
      accessType: summary.accessType,
      publishedAt: summary.publishedAt?.toISOString() ?? null,
      language: summary.language,
      readingMinutes: summary.readingMinutes,
      sortOrder: summary.sortOrder,
      isFeatured: summary.isFeatured,
      subject: summary.subject,
      chapter: summary.chapter,
      pdfAttachment: summary.pdfAttachment
        ? { ...summary.pdfAttachment, createdAt: summary.pdfAttachment.createdAt.toISOString() }
        : null,
      reviewPageQuestionCount: summary._count.reviewQuestions,
      createdAt: summary.createdAt.toISOString(),
      updatedAt: summary.updatedAt.toISOString(),
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}

const blogPostInclude = {
  primaryTopic: true,
  tags: { include: { tag: true } },
  countries: true,
  coverAttachment: true,
} satisfies Prisma.BlogPostInclude

export async function listAdminBlogPosts(q: AdminListQuery) {
  const parsed = listBlogPostsQuerySchema.safeParse({
    page: q.page,
    pageSize: q.pageSize,
    query: q.query,
    status: q.status ?? "all",
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
  })
  if (!parsed.success) invalidQuery()

  const { page, pageSize, query, status, sortBy, sortOrder } = parsed.data
  const and: Prisma.BlogPostWhereInput[] = []
  if (query) and.push({ OR: [
    { title: { contains: query, mode: "insensitive" } },
    { slug: { contains: query, mode: "insensitive" } },
    { excerpt: { contains: query, mode: "insensitive" } },
  ] })
  if (status !== "all") and.push({ status: status as BlogPostStatus })
  const where: Prisma.BlogPostWhereInput = and.length ? { AND: and } : {}

  const [rows, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder } as Prisma.BlogPostOrderByWithRelationInput,
      include: blogPostInclude,
    }),
    prisma.blogPost.count({ where }),
  ])

  return {
    data: rows.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      status: post.status,
      visibility: post.visibility,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      readingMinutes: post.readingMinutes,
      featured: post.featured,
      sortOrder: post.sortOrder,
      contentHtml: post.contentHtml,
      contentText: post.contentText,
      coverAttachmentId: post.coverAttachmentId,
      coverAttachment: post.coverAttachment ? { id: post.coverAttachment.id, url: post.coverAttachment.url, title: post.coverAttachment.title } : null,
      primaryTopic: { id: post.primaryTopic.id, name: post.primaryTopic.name, slug: post.primaryTopic.slug },
      tags: post.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, slug: tag.slug })),
      countries: post.countries.map((country) => country.countryCode),
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}

export async function listAdminBlogTaxonomy(kind: "topic" | "tag", q: AdminListQuery) {
  const parsed = listBlogTaxonomyQuerySchema.safeParse({
    page: q.page,
    pageSize: q.pageSize,
    query: q.query,
    status: q.status ?? "all",
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
  })
  if (!parsed.success) invalidQuery()
  const { page, pageSize, query, status, sortBy, sortOrder } = parsed.data
  const activeFilter = status === "active" ? true : status === "inactive" ? false : undefined
  const search = query ? {
    OR: [
      { name: { contains: query, mode: "insensitive" as const } },
      { slug: { contains: query, mode: "insensitive" as const } },
      { description: { contains: query, mode: "insensitive" as const } },
    ],
  } : {}

  if (kind === "topic") {
    const where: Prisma.BlogTopicWhereInput = { ...search, ...(typeof activeFilter === "boolean" ? { isActive: activeFilter } : {}) }
    const [rows, total] = await Promise.all([
      prisma.blogTopic.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { primaryPosts: true, secondaryPosts: true } } },
      }),
      prisma.blogTopic.count({ where }),
    ])
    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        isActive: row.isActive,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        postsCount: row._count.primaryPosts + row._count.secondaryPosts,
      })),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    }
  }

  const where: Prisma.BlogTagWhereInput = { ...search, ...(typeof activeFilter === "boolean" ? { isActive: activeFilter } : {}) }
  const [rows, total] = await Promise.all([
    prisma.blogTag.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: { _count: { select: { posts: true } } },
    }),
    prisma.blogTag.count({ where }),
  ])
  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      postsCount: row._count.posts,
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}
