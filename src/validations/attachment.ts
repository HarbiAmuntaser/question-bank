// src/validations/attachment.ts
import { z } from "zod"

export const attachmentOwnerTypes = ["question", "quiz", "chapter", "subject", "exam", "blog_post", "study_summary"] as const
export const attachmentKinds = ["image", "pdf", "solution", "other"] as const
export const attachmentStorageProviders = ["local", "external_url", "r2"] as const
export const attachmentVisibilities = ["public", "private"] as const
export const attachmentPurposes = ["blog-cover", "blog-inline", "summary-pdf", "attachment"] as const

export const listAttachmentsQuerySchema = z.object({
  ownerType: z.enum(attachmentOwnerTypes),
  ownerId: z.string().min(1, "ownerId required"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListAttachmentsQuery = z.infer<typeof listAttachmentsQuerySchema>

export const createAttachmentSchema = z.object({
  ownerType: z.enum(attachmentOwnerTypes),
  ownerId: z.string().min(1, "ownerId required"),
  kind: z.enum(attachmentKinds).default("other"),
  storageProvider: z.enum(attachmentStorageProviders).default("external_url"),
  visibility: z.enum(attachmentVisibilities).default("public"),
  purpose: z.enum(attachmentPurposes).default("attachment"),
  title: z
    .string()
    .trim()
    .max(255)
    .optional(),
  url: z
    .string()
    .trim()
    .url()
    .optional(),
})

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>

export const uploadAttachmentSchema = createAttachmentSchema.omit({ storageProvider: true, url: true }).extend({
  visibility: z.enum(attachmentVisibilities).default("public"),
  purpose: z.enum(attachmentPurposes).default("attachment"),
})

export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>
