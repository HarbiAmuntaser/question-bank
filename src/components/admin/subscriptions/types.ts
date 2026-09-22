import type { AccessScopeType } from "@prisma/client";

export type StatusFilter = "all" | "active" | "disabled" | "used" | "expired";

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type SubscriptionFilters = {
  plansStatus: StatusFilter;
  codesStatus: StatusFilter;
  entitlementsStatus: StatusFilter;
};

export type PlanRow = {
  paymentEligible: boolean;
  id: string;
  scopeType: AccessScopeType;
  majorId: string | null;
  subjectId: string | null;
  title: string;
  description: string | null;
  price: string | null;
  currency: string | null;
  isActive: boolean;
  whatsappNumber: string | null;
  telegramUsername: string | null;
  contactMessage: string | null;
  defaultDurationDays: number | null;
  defaultMaxUses: number;
  createdAt: string;
  updatedAt: string;
  major: { id: string; name: string; universityId: string; universityName: string | null } | null;
  subject: {
    id: string;
    name: string;
    majorId: string;
    majorName: string | null;
    universityId: string | null;
    universityName: string | null;
  } | null;
};

export type CodeRow = {
  updatedAt: string;
  id: string;
  planId: string;
  planTitle: string;
  planScopeType: AccessScopeType;
  codePreview: string | null;
  durationDays: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  note: string | null;
  createdAt: string;
};

export type EntitlementRow = {
  updatedAt: string;
  id: string;
  scopeType: AccessScopeType;
  majorName: string | null;
  subjectName: string | null;
  userId: string | null;
  userEmail: string | null;
  codePreview: string | null;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};
