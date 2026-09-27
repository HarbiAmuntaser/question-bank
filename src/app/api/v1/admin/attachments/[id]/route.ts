// src/app/api/v1/admin/attachments/[id]/route.ts
import { prisma } from "@/lib/prisma"
import { json } from "@/lib/server/admin-http";
import { verifyAdmin, adminAuthResponse } from "@/lib/admin-auth"
import { revalidateTag } from "next/cache"
import path from "path"
import { promises as fs } from "fs"
import { CACHE_CONTROL, CACHE_TAGS } from "@/lib/cache-tags"
import {
  revalidateBlogCache,
  revalidateChapterCache,
  revalidateStudySummaryCache,
  type StudySummaryCacheSnapshot,
} from "@/lib/cache-invalidation"
import { deleteObjectFromR2 } from "@/lib/server/storage"

const PUBLIC_PREFIX = "/uploads/attachments"
const UPLOAD_DIR = path.join(process.cwd(), "public")

export const dynamic = "force-dynamic"

function privateHeaders() {
  return new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE })
}

function adminBad(message: string, details?: unknown, status = 400) {
  return json({ error: message, details }, { status, headers: privateHeaders() })
}



function revalidateAttachmentCaches() {
  revalidateTag(CACHE_TAGS.admin.attachments)
}

function safeRevalidateBlogAttachment(input: Parameters<typeof revalidateBlogCache>[0] | null) {
  if (!input) return

  try {
    revalidateBlogCache(input)
  } catch (error) {
    console.error("failed_to_revalidate_blog_attachment_cache", error instanceof Error ? error.message : "unknown_error")
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req, "attachments:write")
  if (!auth.ok) return adminAuthResponse(auth);

  const { id } = await ctx.params
  if (!id) return adminBad("missing_id")

  const existing = await prisma.attachment.findUnique({ where: { id } })
  if (!existing) return json({ error: "not_found" }, { status: 404, headers: privateHeaders() })

  let blogCacheInput: Parameters<typeof revalidateBlogCache>[0] | null = null
  let chapterCacheInput: { id: string; subjectId: string } | null = null
  let summaryCacheInputs: StudySummaryCacheSnapshot[] = []
  if (existing.ownerType === "blog_post") {
    const post = await prisma.blogPost.findUnique({
      where: { id: existing.ownerId },
      select: {
        id: true,
        slug: true,
        status: true,
        visibility: true,
        publishedAt: true,
        countries: { select: { countryCode: true } },
      },
    })

    if (post) {
      blogCacheInput = {
        postId: post.id,
        previous: {
          slug: post.slug,
          status: post.status,
          visibility: post.visibility,
          publishedAt: post.publishedAt,
          countries: post.countries.map((country) => country.countryCode),
        },
      }
    }
  }

  if (existing.ownerType === "chapter") {
    const chapter = await prisma.chapter.findUnique({
      where: { id: existing.ownerId },
      select: { id: true, subjectId: true },
    })
    if (chapter) chapterCacheInput = chapter
  }

  const linkedSummaries = await prisma.studySummary.findMany({
    where: { pdfAttachmentId: existing.id },
    select: { id: true, slug: true, subjectId: true, chapterId: true },
  })
  if (linkedSummaries.length) {
    const affectedQuestions = await prisma.question.count({
      where: {
        reviewSummaryId: { in: linkedSummaries.map((summary) => summary.id) },
        reviewPage: { not: null },
      },
    })
    const acknowledged = new URL(req.url).searchParams.get("acknowledgeReviewPageImpact") === "true"
    if (affectedQuestions > 0 && !acknowledged) {
      return adminBad(
        "summary_pdf_review_pages_require_acknowledgement",
        { affectedQuestions },
        409,
      )
    }
    summaryCacheInputs = linkedSummaries
  }

  if (existing.storageProvider === "r2" && existing.bucket && existing.storageKey) {
    try {
      await deleteObjectFromR2({ bucket: existing.bucket, storageKey: existing.storageKey })
    } catch (error) {
      console.error("failed_to_delete_r2_attachment", error instanceof Error ? error.message : "unknown_error")
      return adminBad("attachment_storage_delete_failed", undefined, 500)
    }
  }

  await prisma.attachment.delete({ where: { id } })

  if (existing.url?.startsWith(PUBLIC_PREFIX)) {
    const relativePath = existing.url.replace(PUBLIC_PREFIX, "").replace(/^\/+/, "")
    const filesystemPath = path.join(UPLOAD_DIR, "uploads", "attachments", relativePath)
    fs.unlink(filesystemPath).catch(() => {})
  }

  revalidateAttachmentCaches()
  safeRevalidateBlogAttachment(blogCacheInput)
  if (chapterCacheInput) revalidateChapterCache(chapterCacheInput)
  for (const summary of summaryCacheInputs) {
    revalidateStudySummaryCache({ previous: summary })
  }
  return json({ message: "attachment_deleted" }, { status: 200, headers: privateHeaders() })
}
