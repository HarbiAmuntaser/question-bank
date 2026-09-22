export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST() {
  return Response.json({ error: "legacy_payment_request_retired" }, {
    status: 410,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" },
  });
}
