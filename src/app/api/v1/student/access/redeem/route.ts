import { paymentPost } from "@/lib/server/payment-http";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(req: Request) { return paymentPost(req); }
