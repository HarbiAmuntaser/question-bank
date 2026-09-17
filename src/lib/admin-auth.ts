import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission, isAdminRole, type AdminPermission, type AdminRole } from "@/lib/admin-permissions";

export type AdminAuthOK = { ok: true; userId: string; role: AdminRole };
export type AdminAuthNO = { ok: false; status: 401 | 403; error: "unauthorized" | "forbidden" };

export class AdminAccessError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "unauthorized" : "forbidden");
    this.name = "AdminAccessError";
  }
}

export async function getAdminAccess(permission: AdminPermission): Promise<AdminAuthOK | AdminAuthNO> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return { ok: false, status: 401, error: "unauthorized" };

  // JWT roles are only a coarse hint. Revocation and role changes must take effect here.
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true, sessionVersion: true },
  });
  if (!user?.isActive || !Number.isInteger(session.user.sessionVersion) || user.sessionVersion !== session.user.sessionVersion || !isAdminRole(user.role) || !hasAdminPermission(user.role, permission)) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true, userId: user.id, role: user.role };
}

export async function requireAdminPermission(permission: AdminPermission): Promise<AdminAuthOK> {
  const access = await getAdminAccess(permission);
  if (!access.ok) throw new AdminAccessError(access.status);
  return access;
}

export async function verifyAdmin(req: Request, permission: AdminPermission): Promise<AdminAuthOK | AdminAuthNO> {
  // Session-authenticated mutations must not accept cross-origin browser submissions.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const site = req.headers.get("sec-fetch-site");
    const trustedOrigin = process.env.NODE_ENV === "production" && process.env.NEXTAUTH_URL
      ? new URL(process.env.NEXTAUTH_URL).origin
      : new URL(req.url).origin;
    if ((origin !== null && origin !== trustedOrigin) || site === "cross-site" || site === "same-site") {
      return { ok: false, status: 403, error: "forbidden" };
    }
  }
  return getAdminAccess(permission);
}

export function adminAuthResponse(auth: AdminAuthNO): Response {
  return Response.json({ error: auth.error }, {
    status: auth.status,
    headers: { "cache-control": "private, no-store" },
  });
}
