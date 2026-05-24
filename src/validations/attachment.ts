// src/validations/attachment.ts
import { z } from "zod"

export const attachmentOwnerTypes = ["question", "exam", "chapter", "subject"] as const
export const attachmentKinds = ["image", "pdf", "solution", "other"] as const

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
