// src/app/api/v1/admin/attachments/route.ts
import { createHash } from "crypto"
import { revalidateTag } from "next/cache"

import { verifyAdmin } from "@/lib/admin-auth"
import { CACHE_CONTROL, CACHE_TAGS } from "@/lib/cache-tags"
import { revalidateBlogCache } from "@/lib/cache-invalidation"
import { json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import {
  buildDatedStorageKey,
  buildPublicR2Url,
  deleteObjectFromR2,
  getR2BucketName,
  putObjectToR2,
  type R2BucketVisibility,
  type StorageKeyFolder,
} from "@/lib/server/storage"
import { createAttachmentSchema, listAttachmentsQuerySchema, uploadAttachmentSchema } from "@/validations/attachment"

export const dynamic = "force-dynamic"

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])
const PDF_MIME_TYPES = new Set(["application/pdf"])
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const PDF_MAX_BYTES = 25 * 1024 * 1024

function privateHeaders() {
  return new Headers({ "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE })
}

function adminBad(message: string, details?: unknown, status = 400) {
  return json({ error: message, details }, { status, headers: privateHeaders() })
}

function adminUnauth(message = "غير مصرح") {
  return json({ error: message }, { status: 401, headers: privateHeaders() })
}

function folderForPurpose(purpose: "blog-cover" | "blog-inline" | "summary-pdf" | "attachment"): StorageKeyFolder {
  if (purpose === "blog-cover") return "blog/covers"
  if (purpose === "blog-inline") return "blog/inline"
  if (purpose === "summary-pdf") return "summaries/pdfs"
  return "attachments"
}

function validateFile(file: File) {
  const contentType = file.type?.trim().toLowerCase()

  if (contentType && IMAGE_MIME_TYPES.has(contentType)) {
    if (file.size > IMAGE_MAX_BYTES) return { ok: false as const, error: "image_too_large", maxBytes: IMAGE_MAX_BYTES }
    return { ok: true as const, contentType, category: "image" as const }
  }

  if (contentType && PDF_MIME_TYPES.has(contentType)) {
    if (file.size > PDF_MAX_BYTES) return { ok: false as const, error: "pdf_too_large", maxBytes: PDF_MAX_BYTES }
    return { ok: true as const, contentType, category: "pdf" as const }
  }

  return { ok: false as const, error: "unsupported_file_type", contentType: contentType || null }
}

function checksumSha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex")
}

function revalidateAttachmentCaches() {
  revalidateTag("exams")
  revalidateTag(CACHE_TAGS.admin.attachments)
}

function safeRevalidateAttachmentCaches() {
  try {
    revalidateAttachmentCaches()
  } catch (error) {
    console.error("failed_to_revalidate_attachment_cache", error instanceof Error ? error.message : "unknown_error")
  }
}

function safeRevalidateBlogCover(input: Parameters<typeof revalidateBlogCache>[0] | null) {
  if (!input) return

  try {
    revalidateBlogCache(input)
  } catch (error) {
    console.error("failed_to_revalidate_blog_cover_cache", error instanceof Error ? error.message : "unknown_error")
  }
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return adminUnauth()

  const url = new URL(req.url)
  const pageParam = url.searchParams.get("page")
  const pageSizeParam = url.searchParams.get("pageSize")
  const parsed = listAttachmentsQuerySchema.safeParse({
    ownerType: url.searchParams.get("ownerType"),
    ownerId: url.searchParams.get("ownerId"),
    page: pageParam ?? undefined,
    pageSize: pageSizeParam ?? undefined,
  })

  if (!parsed.success) {
    return adminBad("bad_query_params", parsed.error.flatten())
  }

  const { ownerType, ownerId, page, pageSize } = parsed.data
  const where = { ownerType: ownerType as never, ownerId }

  const [rows, total] = await Promise.all([
    prisma.attachment.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.attachment.count({ where }),
  ])

  return json(
    {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
    { status: 200, headers: privateHeaders() },
  )
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return adminUnauth()

  const formData = await req.formData().catch(() => null)
  if (!formData) return adminBad("invalid_form_data")

  const dataToValidate = {
    ownerType: formData.get("ownerType"),
    ownerId: formData.get("ownerId"),
    kind: formData.get("kind") ?? "other",
    title: formData.get("title"),
    visibility: formData.get("visibility") ?? "public",
    purpose: formData.get("purpose") ?? formData.get("storageArea") ?? "attachment",
    url: formData.get("url"),
  }

  const file = formData.get("file")

  if (file instanceof File && file.size > 0) {
    const parsed = uploadAttachmentSchema.safeParse(dataToValidate)
    if (!parsed.success) {
      return adminBad("validation_error", parsed.error.flatten())
    }

    const fileCheck = validateFile(file)
    if (!fileCheck.ok) {
      return adminBad(fileCheck.error, fileCheck)
    }
    if (parsed.data.purpose === "blog-cover" && fileCheck.category !== "image") {
      return adminBad("blog_cover_must_be_image")
    }
    if (parsed.data.purpose === "blog-inline" && fileCheck.category !== "image") {
      return adminBad("blog_inline_must_be_image")
    }
    if (parsed.data.purpose === "blog-inline" && parsed.data.ownerType !== "blog_post") {
      return adminBad("blog_inline_owner_must_be_blog_post")
    }
    if (parsed.data.purpose === "blog-inline" && parsed.data.visibility !== "public") {
      return adminBad("blog_inline_must_be_public")
    }
    if (parsed.data.purpose === "summary-pdf" && fileCheck.category !== "pdf") {
      return adminBad("summary_pdf_must_be_pdf")
    }
    if (parsed.data.kind === "image" && fileCheck.category !== "image") {
      return adminBad("image_attachment_must_be_image")
    }
    if (parsed.data.kind === "pdf" && fileCheck.category !== "pdf") {
      return adminBad("pdf_attachment_must_be_pdf")
    }

    const visibility = parsed.data.visibility as R2BucketVisibility
    const bucket = getR2BucketName(visibility)
    const storageKey = buildDatedStorageKey({
      folder: folderForPurpose(parsed.data.purpose),
      fileName: file.name || "attachment",
    })
    const buffer = Buffer.from(await file.arrayBuffer())
    const publicUrl = visibility === "public" ? buildPublicR2Url(storageKey) : null

    try {
      await putObjectToR2({
        bucket,
        storageKey,
        body: buffer,
        contentType: fileCheck.contentType,
        cacheControl: visibility === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
        metadata: {
          ownerType: parsed.data.ownerType,
          ownerId: parsed.data.ownerId,
          purpose: parsed.data.purpose,
        },
      })

      let blogCacheInput: Parameters<typeof revalidateBlogCache>[0] | null = null
      const created = await prisma.$transaction(async (tx) => {
        const attachment = await tx.attachment.create({
          data: {
            ownerType: parsed.data.ownerType as never,
            ownerId: parsed.data.ownerId,
            kind: parsed.data.kind,
            title: parsed.data.title?.trim() || null,
            url: publicUrl,
            storageProvider: "r2",
            visibility,
            bucket,
            storageKey,
            contentType: fileCheck.contentType,
            sizeBytes: file.size,
            originalName: file.name || null,
            checksumSha256: checksumSha256(buffer),
            meta: {
              purpose: parsed.data.purpose,
              uploadedVia: "admin-api",
              category: fileCheck.category,
            },
          },
        })

        if (parsed.data.ownerType === "blog_post" && parsed.data.purpose === "blog-cover") {
          const updatedPost = await tx.blogPost.update({
            where: { id: parsed.data.ownerId },
            data: { coverAttachmentId: attachment.id },
            select: {
              id: true,
              slug: true,
              status: true,
              visibility: true,
              publishedAt: true,
              countries: { select: { countryCode: true } },
            },
          })

          blogCacheInput = {
            postId: updatedPost.id,
            next: {
              slug: updatedPost.slug,
              status: updatedPost.status,
              visibility: updatedPost.visibility,
              publishedAt: updatedPost.publishedAt,
              countries: updatedPost.countries.map((country) => country.countryCode),
            },
          }
        }

        return attachment
      })

      safeRevalidateAttachmentCaches()
      safeRevalidateBlogCover(blogCacheInput)
      return json({ data: created, message: "attachment_created" }, { status: 201, headers: privateHeaders() })
    } catch (error) {
      if (bucket && storageKey) {
        await deleteObjectFromR2({ bucket, storageKey }).catch((cleanupError) => {
          console.error("failed_to_cleanup_r2_attachment", cleanupError instanceof Error ? cleanupError.message : "unknown_error")
        })
      }

      console.error("failed_to_create_r2_attachment", error instanceof Error ? error.message : "unknown_error")
      return adminBad("attachment_upload_failed", undefined, 500)
    }
  }

  const parsed = createAttachmentSchema.safeParse(dataToValidate)
  if (!parsed.success) {
    return adminBad("validation_error", parsed.error.flatten())
  }

  if (!parsed.data.url) {
    return adminBad("file_or_url_required")
  }
  if (parsed.data.visibility === "private") {
    return adminBad("external_url_private_not_supported")
  }

  const created = await prisma.attachment.create({
    data: {
      ownerType: parsed.data.ownerType as never,
      ownerId: parsed.data.ownerId,
      kind: parsed.data.kind,
      title: parsed.data.title?.trim() || null,
      url: parsed.data.url,
      storageProvider: "external_url",
      visibility: "public",
      meta: { addedVia: "admin-api-url" },
    },
  })

  safeRevalidateAttachmentCaches()
  return json({ data: created, message: "attachment_created" }, { status: 201, headers: privateHeaders() })
}
