export type AccessPlan = {
  id: string; scopeType: "subject"; title: string; description: string | null;
  price: string | null; currency: string | null; whatsappNumber: string | null;
  telegramUsername: string | null; contactMessage: string | null;
  majorId: string | null; subjectId: string | null;
  durationDays: number | null;
  universityName: string | null;
  collegeName: string | null;
  majorName: string | null;
  subjectName: string | null;
};

export type ActivePaymentOrder = {
  id: string;
  reference: string;
  status: "pending_payment" | "pending_review" | "awaiting_additional_payment";
};

export type AccessStatus = {
  allowed: boolean;
  canPurchase: boolean;
  canRedeemCode: boolean;
  requiresSubscription: boolean;
  reason: "free" | "free_preview" | "no_paid_plan" | "out_of_scope" | "entitled" |
    "paid_access_required" | "student_signin_required" | "payments_unavailable" | "missing_context" | "not_found";
  scopeType: "subject" | null;
  majorId: string | null;
  subjectId: string | null;
  plan: AccessPlan | null;
  codePlan: AccessPlan | null;
  activeOrder: ActivePaymentOrder | null;
  entitlementId: string | null;
  codeGrantId: string | null;
  accessSource: "manual" | "account_code" | "guest_code" | null;
  expiresAt: string | null;
};
