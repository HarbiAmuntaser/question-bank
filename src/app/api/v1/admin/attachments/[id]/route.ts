// src/app/api/v1/admin/attachments/[id]/route.ts
import { prisma } from "@/lib/prisma"
import { json, bad, unauth } from "@/lib/http"
import { verifyAdmin } from "@/lib/admin-auth"
import { revalidateTag } from "next/cache"
import path from "path"
import { promises as fs } from "fs"

const PUBLIC_PREFIX = "/uploads/attachments"
const UPLOAD_DIR = path.join(process.cwd(), "public")

export const dynamic = "force-dynamic"

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return unauth()

  const { id } = await ctx.params
  if (!id) return bad("missing_id")

  const existing = await prisma.attachment.findUnique({ where: { id } })
  if (!existing) return json({ error: "not_found" }, 404)

  await prisma.attachment.delete({ where: { id } })

  if (existing.url?.startsWith(PUBLIC_PREFIX)) {
    const relativePath = existing.url.replace(PUBLIC_PREFIX, "").replace(/^\/+/, "")
    const filesystemPath = path.join(UPLOAD_DIR, "uploads", "attachments", relativePath)
    fs.unlink(filesystemPath).catch(() => {})
  }

  revalidateTag("exams")
  return json({ message: "attachment_deleted" }, 200)
}
