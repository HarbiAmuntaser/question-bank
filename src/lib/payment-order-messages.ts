import type { ContactMethod } from "@prisma/client";

type MessageItem = {
  subjectName: string;
  universityName: string;
  collegeName: string | null;
  majorName: string | null;
  planTitle: string;
  price: string;
};

function clean(value: string | null | undefined, max = 200) {
  return (value ?? "").replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
}

export function buildOrderContactMessage(input: {
  reference: string;
  items: MessageItem[];
  total: string;
  currency: string;
  status: string;
  expiresAt: Date;
}) {
  const lines = ["طلب اشتراك مواد", `رقم الطلب: ${clean(input.reference, 80)}`];
  input.items.forEach((item, index) => {
    lines.push(
      "",
      ...(input.items.length > 1 ? [`المادة ${index + 1}:`] : []),
      `الجامعة: ${clean(item.universityName)}`,
      ...(clean(item.collegeName) ? [`الكلية: ${clean(item.collegeName)}`] : []),
      ...(clean(item.majorName) ? [`التخصص: ${clean(item.majorName)}`] : []),
      `المادة: ${clean(item.subjectName)}`,
      `الخطة: ${clean(item.planTitle)}`,
      `السعر: ${clean(item.price, 30)} ${clean(input.currency, 10)}`,
    );
  });
  lines.push("", `الإجمالي: ${clean(input.total, 30)} ${clean(input.currency, 10)}`);
  lines.push(input.status === "pending_payment"
    ? `صلاحية الطلب (بتوقيت الرياض): ${input.expiresAt.toLocaleString("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" })}`
    : "الطلب قيد المراجعة");
  return lines.join("\n");
}

export function orderContactHref(method: ContactMethod, recipient: string, message: string) {
  return method === "whatsapp"
    ? `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`
    : `https://t.me/${recipient}?text=${encodeURIComponent(message)}`;
}
