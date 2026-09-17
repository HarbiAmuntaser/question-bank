import type { ContactMethod, PaymentOrderStatus } from "@prisma/client";

export type OrderPlan = {
  planId: string; subjectId: string; subjectName: string; universityName: string;
  planTitle: string; price: string; durationDays: number | null;
};
export type OrderQuote = {
  items: OrderPlan[]; total: string; currency: "SAR"; version: string;
  methods: ContactMethod[]; validForHours: number;
};
export type StudentOrder = {
  id: string; reference: string; status: PaymentOrderStatus; total: string; currency: string;
  createdAt: string; expiresAt: string; contactRequestedAt: string | null;
  contactMethod: ContactMethod; items: OrderPlan[]; canContact: boolean; canCancel: boolean;
  canSubmitReview: boolean; reviewVersion: number; reviewStartedAt: string | null;
  verifiedAmount: string; remainingAmount: string; excessAmount: string;
  messages: { id: string; text: string; createdAt: string }[];
};
export const orderStatusLabels: Record<PaymentOrderStatus, string> = {
  pending_payment: "بانتظار الدفع", pending_review: "بانتظار المراجعة",
  awaiting_additional_payment: "بانتظار استكمال المبلغ", approved: "معتمد",
  rejected: "مرفوض", cancelled: "ملغي", expired: "منتهي الصلاحية",
};
export const contactMethodLabels: Record<ContactMethod, string> = { whatsapp: "واتساب", telegram: "تليجرام" };
export function orderMoney(value: string) { return `${value} SAR`; }
