import "server-only";
import { ZodError } from "zod";
import { AuthRateLimitError, consumeAuthLimit, requestIdentity } from "@/lib/server/auth-rate-limit";
import { paymentJson, readPaymentBody, requirePaymentOrigin } from "@/lib/server/payment-http";
import { PaymentError, requirePaymentStudent, requirePaymentSales, requirePaymentReview } from "@/lib/server/payment-scope";
import { cancelOrder, contactOrder, createOrder, getOrder, listOrders, orderCatalog, OrderError, quoteOrder } from "@/lib/server/payment-orders";
import { emptyOrderActionSchema } from "@/validations/payment-order";
import { submitOrderReview } from "@/lib/server/payment-reviews";

type Action = "list" | "get" | "catalog" | "quote" | "create" | "cancel" | "contact" | "review";
export async function orderHttp(req: Request, action: Action, id?: string) {
  try {
    if (["catalog", "quote", "create"].includes(action)) requirePaymentSales();
    if (["contact", "review"].includes(action)) requirePaymentReview();
    const write = ["quote", "create", "cancel", "contact", "review"].includes(action);
    if (write) requirePaymentOrigin(req);
    await consumeAuthLimit("order-ip:" + action, requestIdentity(req.headers), 60, 60);
    const user = await requirePaymentStudent();
    const [limit, seconds] = action === "create" ? [5, 3600] : write ? [30, 900] : [60, 60];
    await consumeAuthLimit("order-user:" + action, user.id, limit, seconds);
    const body = write ? await readPaymentBody(req) : Object.fromEntries(new URL(req.url).searchParams);
    if (action === "create") {
      const result = await createOrder(body);
      return paymentJson({ data: result }, result.alreadyCreated ? 200 : 201);
    }
    if (action === "quote") return paymentJson({ data: await quoteOrder(body) });
    if (action === "catalog") return paymentJson({ data: await orderCatalog(body) });
    if (action === "list") return paymentJson({ data: await listOrders(body) });
    if (action === "get") return paymentJson({ data: await getOrder(id ?? "") });
    if (action === "review") return paymentJson({ data: await submitOrderReview(id ?? "", body) });
    emptyOrderActionSchema.parse(body);
    return paymentJson({ data: action === "cancel" ? await cancelOrder(id ?? "") : await contactOrder(id ?? "") });
  } catch (error) {
    if (error instanceof PaymentError) return paymentJson({ error: error.code,
      ...(error instanceof OrderError && error.orderId ? { orderId: error.orderId } : {}) }, error.status);
    if (error instanceof ZodError) return paymentJson({ error: "invalid_payload" }, 400);
    if (error instanceof AuthRateLimitError) return paymentJson({ error: "too_many_requests" }, 429, { "Retry-After": String(error.retryAfter) });
    console.error("payment_order_failed", { action });
    return paymentJson({ error: "payment_temporarily_unavailable" }, 503);
  }
}
