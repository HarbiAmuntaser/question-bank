import type { PaymentLedgerKind, PaymentReviewAction } from "@prisma/client";
import type { StudentOrder } from "@/lib/payment-orders";

export type ReviewActivity = {
  id: string; action: PaymentReviewAction; version: number; createdAt: string; actor: string;
  internalNote: string; studentMessage: string | null; conflictCode: string | null;
  ledger: { id: string; kind: PaymentLedgerKind; amount: string; reference: string | null; sourceId: string | null; canCorrect: boolean }[];
};
export type AdminOrder = StudentOrder & {
  student: { id: string; name: string | null; email: string; isActive: boolean };
  activity: ReviewActivity[]; nextBefore: number | null;
  grants: { subjectId: string; entitlementId: string; expiresAt: string | null; isActive: boolean }[];
  reviewEnabled: boolean;
};
export const reviewActionLabels: Record<PaymentReviewAction, string> = {
  submitted: "طلب مراجعة", receipt: "دفعة موثقة", refund: "رد مبلغ موثق", correction: "تصحيح مالي",
  additional_requested: "طلب استكمال المبلغ", approved: "اعتماد الطلب", rejected: "رفض الطلب", approval_blocked: "تعارض عند الاعتماد", note: "ملاحظة",
};
export const ledgerKindLabels: Record<PaymentLedgerKind, string> = { receipt: "استلام", refund: "رد مبلغ", void: "إبطال سجل", correction: "قيمة مصححة" };
