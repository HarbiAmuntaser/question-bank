import { safeCallbackPath } from "@/lib/auth-policy";
export class OrderClientError extends Error {
  constructor(public code: string, public orderId?: string) { super(code); }
}
export function orderErrorMessage(code: string) {
  const messages: Record<string, string> = {
    payments_unavailable: "إنشاء الطلبات الجديدة غير متاح حاليًا.",
    payment_review_unavailable: "متابعة الطلبات والمراجعة متوقفتان مؤقتًا.",
    plan_not_in_launch: "إحدى الخطط خارج قائمة البيع الحالية.",
    payment_scope_not_allowed: "إحدى المواد غير متاحة للطلب حاليًا.",
    plan_not_orderable: "السعر أو مدة الاشتراك غير متاحين لهذه المادة.",
    duplicate_subject: "لا يمكن إضافة خطتين للمادة نفسها في طلب واحد.",
    quote_changed: "تغيّرت تفاصيل العرض. راجع التسعير المحدّث قبل تأكيد الطلب.",
    contact_unavailable: "لا توجد قناة تواصل مشتركة للمواد المختارة.",
    contact_changed: "تغيّرت قناة التواصل أو توفر المادة. لا تستخدم بيانات دفع قديمة.",
    active_order_exists: "لديك طلب نشط للمواد نفسها.",
    active_entitlement_exists: "يوجد اشتراك فعال لإحدى المواد. لا يمكن تجديدها ضمن طلب جديد الآن.",
    overlapping_order_exists: "يوجد طلب آخر قيد المعالجة لإحدى المواد.",
    order_changed: "تم تحديث الطلب. راجع التفاصيل الحالية ثم أعد المحاولة.",
    order_not_reviewable: "الطلب غير متاح للإرسال إلى المراجعة في حالته الحالية.",
    payment_incomplete: "المبلغ الموثق أقل من إجمالي الطلب.",
    overpayment_requires_settlement: "المبلغ الزائد يحتاج تسوية يدوية قبل الاعتماد.",
    student_account_unavailable: "حساب الطالب غير متاح للاعتماد حاليًا.",
    order_already_approved: "تم اعتماد الطلب مسبقًا.",
    no_additional_payment_due: "لا يوجد مبلغ إضافي قابل للطلب في الحالة الحالية.",
    settlement_required_before_rejection: "يجب تسوية الرصيد الموثق قبل رفض الطلب.",
    transfer_reference_used: "مرجع التحويل مسجل مسبقًا. لم تتم إضافة دفعة أخرى.",
    refund_exceeds_balance: "المبلغ المرتجع يتجاوز الرصيد الموثق.",
    ledger_entry_not_correctable: "السجل غير قابل للتصحيح أو تم تصحيحه مسبقًا.",
    correction_unchanged: "القيمة المصححة مطابقة للقيمة الحالية.",
    idempotency_key_reused: "تغيرت بيانات العملية. حدّث الصفحة قبل إرسال عملية جديدة.",
    invalid_payload: "راجع الحقول المطلوبة وصيغة المبلغ والمرجع.",
    forbidden: "ليست لديك صلاحية لتنفيذ هذه العملية.",
    order_not_payable: "هذا الطلب غير متاح للتواصل بشأن الدفع.",
    order_not_cancellable: "لم يعد هذا الطلب قابلًا للإلغاء.",
    too_many_requests: "وصلت إلى حد المحاولات. انتظر قليلًا ثم حاول مجددًا.",
    student_signin_required: "يلزم تسجيل الدخول بحساب طالب مؤكد البريد.",
    not_found: "الطلب غير موجود أو غير متاح لحسابك.",
  };
  return messages[code] ?? "تعذرت العملية. لم يتم تأكيد أي دفع. حاول مجددًا.";
}
export async function orderRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/student/orders${path}`, { method: body === undefined ? "GET" : "POST",
    ...(body !== undefined ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}), cache: "no-store", signal });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) window.location.assign(`/auth/signin?callbackUrl=${encodeURIComponent(safeCallbackPath(window.location.pathname + window.location.search))}`);
    throw new OrderClientError(result?.error ?? "failed", result?.orderId);
  }
  return result.data as T;
}
