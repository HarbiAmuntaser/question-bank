export type CodeAccessOutcome = "activated" | "already_active" | "recovered" | "transferred";

export type CodeAccessSupport = {
  supportReference: string | null;
  whatsappNumber: string | null;
  maxBrowserSessions: number;
  retryAfterSeconds: number | null;
};

export function codeAccessSuccessMessage(outcome: CodeAccessOutcome | undefined, principalType?: "account" | "guest") {
  switch (outcome) {
    case "recovered":
      return "تمت استعادة الوصول في هذا المتصفح مع بقاء تاريخ انتهاء الاشتراك كما هو.";
    case "transferred":
      return "تم نقل الوصول إلى هذا المتصفح وإيقافه في المتصفح السابق.";
    case "already_active":
      return "الوصول بهذا الكود فعال بالفعل.";
    case "activated":
    default:
      return principalType === "account"
        ? "تم تفعيل الكود وربط الوصول بحسابك."
        : "تم تفعيل الكود لهذا المتصفح.";
  }
}

export function codeAccessErrorMessage(code: string | undefined, retryAfterSeconds?: number | null) {
  switch (code) {
    case "payment_codes_unavailable":
      return "تفعيل الأكواد متوقف حاليًا.";
    case "browser_limit_reached":
      return "هذا الكود مستخدم حاليًا في الحد الأقصى من المتصفحات. يمكنك نقل الوصول إلى هذا المتصفح.";
    case "transfer_too_soon": {
      const minutes = Math.max(1, Math.ceil((retryAfterSeconds ?? 60) / 60));
      return "تم نقل الوصول مؤخرًا. يمكنك المحاولة مجددًا بعد " + minutes + (minutes === 1 ? " دقيقة." : " دقائق.");
    }
    case "transfer_support_required":
      return "وصل هذا الكود إلى الحد المسموح لعمليات النقل خلال 24 ساعة. تواصل مع الدعم للمساعدة.";
    case "session_revoked":
      return "تم إلغاء هذه الجلسة. أعد المحاولة من متصفح آخر أو تواصل مع الدعم.";
    case "too_many_requests":
      return "محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم أعد المحاولة.";
    case "payment_temporarily_unavailable":
      return "تعذر التحقق من الكود حاليًا. أعد المحاولة بعد قليل.";
    case "code_used":
      return "هذا الكود مرتبط بوصول آخر أو لم يعد متاحًا للتفعيل.";
    case "inactive_code":
      return "هذا الكود معطل حاليًا. لا يمكن استخدامه للاستعادة أو النقل.";
    case "code_not_started":
      return "هذا الكود لم يبدأ تفعيله بعد.";
    case "code_expired":
      return "انتهت صلاحية هذا الكود.";
    case "code_plan_not_enabled":
      return "الخطة المرتبطة بهذا الكود غير مفعلة حاليًا ضمن قناة الأكواد.";
    case "active_entitlement_exists":
      return "لديك وصول فعال لهذه المادة بالفعل، لذلك لم يتم استهلاك الكود.";
    case "invalid_code_window":
      return "لا يحتوي الكود أو خطته على مدة وصول صالحة. تواصل مع الدعم.";
    case "inactive_plan":
      return "الخطة المرتبطة بهذا الكود غير نشطة حاليًا.";
    case "invalid_plan_scope":
    case "payment_target_mismatch":
      return "هذا الكود غير مخصص للمادة الحالية.";
    case "invalid_code":
    default:
      return "الكود غير صحيح أو غير متاح.";
  }
}

export function whatsappCodeSupportUrl(input: {
  whatsappNumber: string | null | undefined;
  supportReference: string | null | undefined;
  targetTitle: string;
  planTitle: string;
  maxBrowserSessions: number;
}) {
  const phone = input.whatsappNumber?.trim().replace(/^\+/, "") ?? "";
  const reference = input.supportReference?.trim() ?? "";
  if (!/^\d{6,20}$/.test(phone) || !/^AC-[A-Z2-9]{12}$/.test(reference)) return null;
  const target = input.targetTitle.trim().slice(0, 200);
  const plan = input.planTitle.trim().slice(0, 200);
  const currentLimit = Number.isInteger(input.maxBrowserSessions) && input.maxBrowserSessions >= 1
    ? Math.min(input.maxBrowserSessions, 100)
    : 1;
  const message = [
    "مرحبًا، أحتاج مساعدة في وصول كود التفعيل.",
    "المحتوى: " + target,
    "الخطة: " + plan,
    "مرجع الدعم: " + reference,
    "عدد المتصفحات المسموح حاليًا: " + currentLimit,
    "الطلب: السماح بمتصفح إضافي (الإجمالي المطلوب " + (currentLimit + 1) + ").",
  ].join("\n");
  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
}

function safeMessageLine(value: string | null | undefined, max = 200) {
  return (value ?? "").replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
}

export function whatsappActivationCodeRequestUrl(input: {
  whatsappNumber: string | null | undefined;
  universityName: string | null | undefined;
  collegeName: string | null | undefined;
  majorName: string | null | undefined;
  subjectName: string | null | undefined;
  planTitle: string;
  price: string | null | undefined;
  currency: string | null | undefined;
  durationDays: number | null | undefined;
}) {
  const phone = input.whatsappNumber?.trim().replace(/^\+/, "") ?? "";
  const university = safeMessageLine(input.universityName);
  const college = safeMessageLine(input.collegeName);
  const major = safeMessageLine(input.majorName);
  const subject = safeMessageLine(input.subjectName);
  const plan = safeMessageLine(input.planTitle);
  if (!/^\d{6,20}$/.test(phone) || !university || !major || !subject || !plan) return null;
  const price = safeMessageLine(input.price, 30);
  const currency = safeMessageLine(input.currency, 10);
  const durationDays = Number.isInteger(input.durationDays) && Number(input.durationDays) >= 1
    ? Math.min(Number(input.durationDays), 36500)
    : null;
  const message = [
    "مرحبًا، أريد طلب كود تفعيل لمادة.",
    "نوع الطلب: إصدار كود تفعيل جديد",
    "الجامعة: " + university,
    ...(college ? ["الكلية: " + college] : []),
    "التخصص: " + major,
    "المادة: " + subject,
    "الخطة: " + plan,
    ...(price ? ["السعر: " + price + (currency ? " " + currency : "")] : []),
    ...(durationDays ? ["مدة الوصول: " + durationDays + " يوم"] : []),
  ].join("\n");
  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
}
