import type { OrderPlan } from "@/lib/payment-orders";
import { orderMoney } from "@/lib/payment-orders";
export function OrderItems({ items }: { items: OrderPlan[] }) {
  return <ul className="divide-y border-y">{items.map((item) => <li key={item.subjectId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4">
    <div className="min-w-0 space-y-1"><div className="break-words font-medium">{item.subjectName}</div>
      <div className="break-words text-sm text-muted-foreground">{item.universityName}</div>
      <div className="break-words text-xs text-muted-foreground">{item.planTitle} · {item.durationDays === null ? "مدة مفتوحة" : `${item.durationDays} يومًا`}</div></div>
    <span dir="ltr" className="whitespace-nowrap text-sm font-semibold tabular-nums">{orderMoney(item.price)}</span>
  </li>)}</ul>;
}
