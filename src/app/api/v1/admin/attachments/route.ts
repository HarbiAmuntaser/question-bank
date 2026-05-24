// src/app/api/v1/admin/attachments/route.ts
import { prisma } from "@/lib/prisma"
import { json, bad, unauth } from "@/lib/http"
import { verifyAdmin } from "@/lib/admin-auth"
import { listAttachmentsQuerySchema, createAttachmentSchema } from "@/validations/attachment"
import { revalidateTag } from "next/cache"
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"

export const dynamic = "force-dynamic"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "attachments")
const PUBLIC_PREFIX = "/uploads/attachments"

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = listAttachmentsQuerySchema.safeParse({
    ownerType: url.searchParams.get("ownerType"),
    ownerId: url.searchParams.get("ownerId"),
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
  })

  if (!parsed.success) {
    return bad("bad_query_params", parsed.error.flatten())
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
    200,
  )
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return unauth()

  const formData = await req.formData().catch(() => null)
  if (!formData) return bad("invalid_form_data")

  const dataToValidate = {
    ownerType: formData.get("ownerType"),
    ownerId: formData.get("ownerId"),
    kind: formData.get("kind") ?? "other",
    title: formData.get("title"),
    url: formData.get("url"),
  }

  const parsed = createAttachmentSchema.safeParse(dataToValidate)
  if (!parsed.success) {
    return bad("validation_error", parsed.error.flatten())
  }

  let finalUrl = parsed.data.url ?? null
  const file = formData.get("file")

  if (!finalUrl && file instanceof File && file.size > 0) {
    await ensureUploadDir()
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = path.extname(file.name || "") || ""
    const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`
    const targetPath = path.join(UPLOAD_DIR, filename)
    await fs.writeFile(targetPath, buffer)
    finalUrl = `${PUBLIC_PREFIX}/${filename}`
  }

  if (!finalUrl) {
    return bad("file_or_url_required")
  }

  const created = await prisma.attachment.create({
    data: {
      ownerType: parsed.data.ownerType as never,
      ownerId: parsed.data.ownerId,
      kind: parsed.data.kind,
      title: parsed.data.title?.trim() || null,
      url: finalUrl,
      meta: file instanceof File ? { originalName: file.name, stored: finalUrl.startsWith(PUBLIC_PREFIX) } : undefined,
    },
  })

  revalidateTag("exams")
  return json({ data: created, message: "attachment_created" }, 201)
}
