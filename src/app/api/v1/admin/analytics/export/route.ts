import { adminAuthResponse, verifyAdmin } from "@/lib/admin-auth"
import { CACHE_CONTROL } from "@/lib/cache-tags"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const auth = await verifyAdmin(req, "analytics:read")
  if (!auth.ok) return adminAuthResponse(auth)

  return Response.json(
    { error: "analytics_exports_unavailable" },
    { status: 410, headers: { "cache-control": CACHE_CONTROL.PRIVATE_NO_STORE } },
  )
}
