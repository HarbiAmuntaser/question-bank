import { orderHttp } from "@/lib/server/payment-order-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function POST(req: Request) { return orderHttp(req, "quote"); }
