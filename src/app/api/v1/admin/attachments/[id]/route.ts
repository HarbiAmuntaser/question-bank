// src/app/api/v1/admin/attachments/[id]/route.ts
import { prisma } from "@/lib/prisma"
import { json } from "@/lib/http"
import { verifyAdmin } from "@/lib/admin-auth"
import { revalidateTag } from "next/cache"
import path from "path"
import { promises as fs } from "fs"
import { CACHE_CONTROL, CACHE_TAGS } from "@/lib/cache-tags"
import { revalidateBlogCache } from "@/lib/cache-invalidation"
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

function adminUnauth(message = "غير مصرح") {
  return json({ error: message }, { status: 401, headers: privateHeaders() })
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
  const auth = await verifyAdmin(req)
  if (!auth.ok) return adminUnauth()

  const { id } = await ctx.params
  if (!id) return adminBad("missing_id")

  const existing = await prisma.attachment.findUnique({ where: { id } })
  if (!existing) return json({ error: "not_found" }, { status: 404, headers: privateHeaders() })

  let blogCacheInput: Parameters<typeof revalidateBlogCache>[0] | null = null
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
  return json({ message: "attachment_deleted" }, { status: 200, headers: privateHeaders() })
}
