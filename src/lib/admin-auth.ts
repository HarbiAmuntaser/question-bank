import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const allowedRoles = new Set(["admin", "editor", "moderator"]);

export type AdminAuthOK = { ok: true; userId: string; role: string };
export type AdminAuthNO = { ok: false };

export async function verifyAdmin(req: Request): Promise<AdminAuthOK | AdminAuthNO> {
  // 1) NextAuth session (كوكيز)
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    const id = (session?.user as { id?: string } | undefined)?.id;
    if (session && role && id && allowedRoles.has(role)) {
      return { ok: true, userId: id, role };
    }
  } catch {
    // تجاهل الخطأ وانتقل للـ API key
  }

  // 2) API Key للسيرفر-أكشن/سيرفر-تو-سيرفر
  // ندعم الاسمين للتوافق:
  const keyHeader = req.headers.get("x-admin-key") || req.headers.get("x-api-key");
  if (keyHeader && process.env.ADMIN_API_KEY && keyHeader === process.env.ADMIN_API_KEY) {
    // نُعيد userId = "api-key" لتجنّب مشاكل FK
    return { ok: true, userId: "api-key", role: "admin" };
  }

  return { ok: false };
}
