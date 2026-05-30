"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import type { AccessScopeType } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import {
  codePreviewFromPlainCode,
  generateSubscriptionCode,
  hashSubscriptionCode,
} from "@/lib/server/subscription-code";

const ADMIN_PATH = "/admin/subscriptions";

async function assertAdminSession() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role || !["admin", "editor", "moderator"].includes(user.role)) {
    throw new Error("unauthorized");
  }
  return { userId: user.id, role: user.role };
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length ? value : null;
}

function intOrNull(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function dateOrNull(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function scopeTypeFromForm(formData: FormData): AccessScopeType {
  return text(formData, "scopeType") === "subject" ? "subject" : "major";
}

async function revalidateSubscriptionAdmin() {
  revalidatePath(ADMIN_PATH);
  revalidateTag(CACHE_TAGS.public.majors);
  revalidateTag(CACHE_TAGS.public.subjects);
  revalidateTag(CACHE_TAGS.public.quizzes);
}

export async function createPaidAccessPlanAction(formData: FormData) {
  await assertAdminSession();

  const scopeType = scopeTypeFromForm(formData);
  const majorId = text(formData, "majorId");
  const subjectId = text(formData, "subjectId");
  const title = text(formData, "title");

  if (!title) return { success: false, message: "عنوان الخطة مطلوب" };
  if (scopeType === "major" && !majorId) return { success: false, message: "اختيار التخصص مطلوب" };
  if (scopeType === "subject" && !subjectId) return { success: false, message: "اختيار المقرر مطلوب" };

  await prisma.paidAccessPlan.create({
    data: {
      scopeType,
      majorId: scopeType === "major" ? majorId : null,
      subjectId: scopeType === "subject" ? subjectId : null,
      title,
      description: nullableText(formData, "description"),
      price: nullableText(formData, "price"),
      currency: nullableText(formData, "currency") ?? "SAR",
      isActive: formData.get("isActive") === "on",
      whatsappNumber: nullableText(formData, "whatsappNumber"),
      telegramUsername: nullableText(formData, "telegramUsername"),
      contactMessage: nullableText(formData, "contactMessage"),
      defaultDurationDays: intOrNull(formData, "defaultDurationDays"),
      defaultMaxUses: intOrNull(formData, "defaultMaxUses") ?? 1,
    },
  });

  await revalidateSubscriptionAdmin();
  return { success: true, message: "تم إنشاء الخطة" };
}

export async function updatePaidAccessPlanAction(id: string, formData: FormData) {
  await assertAdminSession();

  const scopeType = scopeTypeFromForm(formData);
  const majorId = text(formData, "majorId");
  const subjectId = text(formData, "subjectId");
  const title = text(formData, "title");

  if (!title) return { success: false, message: "عنوان الخطة مطلوب" };
  if (scopeType === "major" && !majorId) return { success: false, message: "اختيار التخصص مطلوب" };
  if (scopeType === "subject" && !subjectId) return { success: false, message: "اختيار المقرر مطلوب" };

  await prisma.paidAccessPlan.update({
    where: { id },
    data: {
      scopeType,
      majorId: scopeType === "major" ? majorId : null,
      subjectId: scopeType === "subject" ? subjectId : null,
      title,
      description: nullableText(formData, "description"),
      price: nullableText(formData, "price"),
      currency: nullableText(formData, "currency") ?? "SAR",
      isActive: formData.get("isActive") === "on",
      whatsappNumber: nullableText(formData, "whatsappNumber"),
      telegramUsername: nullableText(formData, "telegramUsername"),
      contactMessage: nullableText(formData, "contactMessage"),
      defaultDurationDays: intOrNull(formData, "defaultDurationDays"),
      defaultMaxUses: intOrNull(formData, "defaultMaxUses") ?? 1,
    },
  });

  await revalidateSubscriptionAdmin();
  return { success: true, message: "تم تحديث الخطة" };
}

export async function createSubscriptionCodeAction(formData: FormData) {
  const admin = await assertAdminSession();

  const planId = text(formData, "planId");
  if (!planId) return { success: false, message: "اختيار الخطة مطلوب" };

  const plan = await prisma.paidAccessPlan.findUnique({
    where: { id: planId },
    select: { id: true, defaultMaxUses: true },
  });
  if (!plan) return { success: false, message: "الخطة غير موجودة" };

  const maxUses = intOrNull(formData, "maxUses") ?? plan.defaultMaxUses ?? 1;
  const durationDays = intOrNull(formData, "durationDays");
  const startsAt = dateOrNull(formData, "startsAt");
  const expiresAt = dateOrNull(formData, "expiresAt");
  const note = nullableText(formData, "note");

  let plainCode = "";
  let codeHash = "";
  for (let i = 0; i < 10; i += 1) {
    plainCode = generateSubscriptionCode();
    codeHash = hashSubscriptionCode(plainCode);
    const exists = await prisma.subscriptionCode.findUnique({ where: { codeHash }, select: { id: true } });
    if (!exists) break;
  }

  await prisma.subscriptionCode.create({
    data: {
      planId,
      codeHash,
      codePreview: codePreviewFromPlainCode(plainCode),
      durationDays,
      startsAt,
      expiresAt,
      maxUses,
      isActive: true,
      note,
      createdBy: admin.userId,
    },
  });

  await revalidateSubscriptionAdmin();
  return { success: true, message: "تم إنشاء الكود", plainCode };
}

export async function disableSubscriptionCodeAction(id: string) {
  await assertAdminSession();
  await prisma.subscriptionCode.update({ where: { id }, data: { isActive: false } });
  await revalidateSubscriptionAdmin();
  return { success: true, message: "تم تعطيل الكود" };
}

export async function disableAccessEntitlementAction(id: string) {
  await assertAdminSession();
  await prisma.accessEntitlement.update({ where: { id }, data: { isActive: false } });
  await revalidateSubscriptionAdmin();
  return { success: true, message: "تم تعطيل الاشتراك" };
}
