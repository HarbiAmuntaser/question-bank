import "server-only"

import type { Prisma } from "@prisma/client"

export type PaymentPathFilters = {
  universityId: string
  collegeId: string
  majorId: string
  subjectId: string
}

type SearchParams = Record<string, string | string[] | undefined>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function one(params: SearchParams, key: keyof PaymentPathFilters): string {
  const raw = params[key]
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ""
  return UUID.test(value) ? value : ""
}

export function readPaymentPathFilters(params: SearchParams): PaymentPathFilters {
  return {
    universityId: one(params, "universityId"),
    collegeId: one(params, "collegeId"),
    majorId: one(params, "majorId"),
    subjectId: one(params, "subjectId"),
  }
}

export function hasPaymentPathFilters(filters: PaymentPathFilters): boolean {
  return Object.values(filters).some(Boolean)
}

export function paymentSubjectPathWhere(filters: PaymentPathFilters): Prisma.SubjectWhereInput {
  const major = filters.collegeId || filters.universityId
    ? {
        ...(filters.collegeId ? { collegeId: filters.collegeId } : {}),
        ...(filters.universityId ? { universityId: filters.universityId } : {}),
      }
    : undefined

  return {
    ...(filters.subjectId ? { id: filters.subjectId } : {}),
    ...(filters.majorId ? { majorId: filters.majorId } : {}),
    ...(major ? { major } : {}),
  }
}

export function paymentPlanPathWhere(filters: PaymentPathFilters): Prisma.PaidAccessPlanWhereInput {
  if (!hasPaymentPathFilters(filters)) return {}
  const subject = paymentSubjectPathWhere(filters)
  if (filters.subjectId) return { subject }

  const major: Prisma.MajorWhereInput = {
    ...(filters.majorId ? { id: filters.majorId } : {}),
    ...(filters.collegeId ? { collegeId: filters.collegeId } : {}),
    ...(filters.universityId ? { universityId: filters.universityId } : {}),
  }
  return { OR: [{ subject }, { major }] }
}
