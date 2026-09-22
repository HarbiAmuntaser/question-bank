"use server";

import { ZodError } from "zod";
import { requireAdminPermission } from "@/lib/admin-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { PaymentError, paymentSubjectWhere } from "@/lib/server/payment-scope";
import { disablePaymentPlan, disablePaymentCode, revokePaymentEntitlement, issuePaymentCode, savePaymentPlan } from "@/lib/server/payment-admin";
import { protectPaymentAdminAction } from "@/lib/server/payment-admin-action";
import { AuthRateLimitError } from "@/lib/server/auth-rate-limit";

function text(form: FormData, key: string) { const value = form.get(key); return typeof value === "string" ? value.trim() : ""; }
function nullableText(form: FormData, key: string) { return text(form, key) || null; }
function number(form: FormData, key: string) { const value = text(form, key); return value ? Number(value) : null; }
function date(form: FormData, key: string) { const value = text(form, key); return value ? new Date(value) : null; }
function changeInput(form: FormData) {
  return { reason: text(form, "reason"), expectedUpdatedAt: text(form, "expectedUpdatedAt") || undefined,
    confirmContentChange: form.get("confirmContentChange") === "on" };
}
function planInput(form: FormData) {
  return { scopeType: text(form, "scopeType"), subjectId: text(form, "subjectId"), title: text(form, "title"),
    description: nullableText(form, "description"), price: nullableText(form, "price"), currency: text(form, "currency") || "SAR",
    isActive: form.get("isActive") === "on", whatsappNumber: nullableText(form, "whatsappNumber"),
    telegramUsername: nullableText(form, "telegramUsername"), contactMessage: nullableText(form, "contactMessage"),
    defaultDurationDays: number(form, "defaultDurationDays"), defaultMaxUses: number(form, "defaultMaxUses") ?? 1 };
}
function failure(error: unknown) {
  if (error instanceof AuthRateLimitError) return { success: false, message: "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة." };
  if (error instanceof ZodError) return { success: false, message: "تحقق من بيانات الخطة أو الكود. النطاق المتاح هو المادة فقط." };
  if (error instanceof PaymentError) {
    const messages: Record<string, string> = { payments_unavailable: "تفعيل خطط البيع متوقف حاليًا.",
      payment_codes_unavailable: "إصدار الأكواد متوقف حاليًا.",
      payment_target_changed: "تغيّر السجل. حدّث الصفحة وراجع بياناته قبل إعادة المحاولة.",
      payment_content_confirmation_required: "تأكيد أثر تعطيل الخطة على إتاحة المحتوى مطلوب.",
      not_found: "السجل غير موجود.",
      payment_scope_not_allowed: "المتاح فقط مواد الجامعات السعودية النشطة.", payment_target_immutable: "لا يمكن تغيير المادة المرتبطة بالخطة. أنشئ خطة مستقلة.",
      forbidden: "لا تملك صلاحية تنفيذ العملية." };
    return { success: false, message: messages[error.code] ?? "تعذر حفظ العملية. حاول مجددًا." };
  }
  console.error("payment_admin_action_failed");
  return { success: false, message: "تعذر تنفيذ العملية حاليًا. لم يتم اعتماد تغيير جزئي." };
}
function revalidateSubscriptions() {
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/subscriptions/audit");
  revalidatePath("/admin/payment-orders", "layout");
  revalidateTag(CACHE_TAGS.public.majors); revalidateTag(CACHE_TAGS.public.subjects); revalidateTag(CACHE_TAGS.public.quizzes);
}

export async function createPaidAccessPlanAction(form: FormData) {
  const admin = await requireAdminPermission("subscriptions:manage");
  try { await protectPaymentAdminAction(admin.userId); await savePaymentPlan(planInput(form), changeInput(form)); revalidateSubscriptions(); return { success: true, message: "تم إنشاء الخطة" }; }
  catch (error) { return failure(error); }
}
export async function updatePaidAccessPlanAction(id: string, form: FormData) {
  const admin = await requireAdminPermission("subscriptions:manage");
  try { await protectPaymentAdminAction(admin.userId); await savePaymentPlan(planInput(form), changeInput(form), id); revalidateSubscriptions(); return { success: true, message: "تم تحديث الخطة" }; }
  catch (error) { return failure(error); }
}
export async function disablePaidAccessPlanAction(id: string, input: unknown) {
  const admin = await requireAdminPermission("subscriptions:manage");
  try { await protectPaymentAdminAction(admin.userId); await disablePaymentPlan(id, input); revalidateSubscriptions(); return { success: true, message: "تم تعطيل الخطة" }; }
  catch (error) { return failure(error); }
}
export async function createSubscriptionCodeAction(form: FormData) {
  const admin = await requireAdminPermission("subscriptions:manage");
  try {
    await protectPaymentAdminAction(admin.userId);
    const plainCode = await issuePaymentCode({ planId: text(form, "planId"), maxUses: number(form, "maxUses"),
      durationDays: number(form, "durationDays"), startsAt: date(form, "startsAt"), expiresAt: date(form, "expiresAt"), note: nullableText(form, "note") }, text(form, "reason"));
    revalidateSubscriptions(); return { success: true, message: "تم إنشاء الكود", plainCode };
  } catch (error) { return { ...failure(error), plainCode: undefined }; }
}
export async function disableSubscriptionCodeAction(id: string, input: unknown) {
  const admin = await requireAdminPermission("subscriptions:manage");
  try { await protectPaymentAdminAction(admin.userId); await disablePaymentCode(id, input); revalidateSubscriptions(); return { success: true, message: "تم تعطيل الكود" }; }
  catch (error) { return failure(error); }
}
export async function disableAccessEntitlementAction(id: string, input: unknown) {
  const admin = await requireAdminPermission("subscriptions:manage");
  try { await protectPaymentAdminAction(admin.userId); await revokePaymentEntitlement(id, input); revalidateSubscriptions(); return { success: true, message: "تم تعطيل الاشتراك" }; }
  catch (error) { return failure(error); }
}

export async function searchPaymentSubjectsAction(query = "") {
  const admin = await requireAdminPermission("subscriptions:manage");
  await protectPaymentAdminAction(admin.userId, false);
  const rows = await prisma.subject.findMany({ where: { ...paymentSubjectWhere(), name: { contains: query.trim().slice(0, 100), mode: "insensitive" } },
    take: 30, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, major: { select: { name: true, university: { select: { name: true } } } } } });
  return rows.map((row) => ({ id: row.id, label: row.name, subLabel: `${row.major.university.name} / ${row.major.name}` }));
}
