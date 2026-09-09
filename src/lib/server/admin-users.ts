import "server-only";

import { Prisma, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type UserUpdate = {
  name?: string | null;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
};

export class AdminUserError extends Error {
  constructor(message: string, public readonly status: 403 | 404 | 409) {
    super(message);
    this.name = "AdminUserError";
  }
}

async function guardUserChange(tx: Prisma.TransactionClient, actorId: string, id: string, data: UserUpdate | null) {
  const actor = await tx.user.findUnique({
    where: { id: actorId },
    select: { role: true, isActive: true },
  });
  if (!actor?.isActive || actor.role !== "admin") throw new AdminUserError("forbidden", 403);

  const target = await tx.user.findUnique({
    where: { id },
    select: { role: true, isActive: true },
  });
  if (!target) throw new AdminUserError("not_found", 404);

  const removesAdmin = data === null || data.isActive === false ||
    (data.role !== undefined && data.role !== "admin");
  if (removesAdmin && target.role === "admin" && target.isActive) {
    const count = await tx.user.count({ where: { role: "admin", isActive: true } });
    if (count <= 1) throw new AdminUserError("last_active_admin", 409);
  }
  if (actorId === id && removesAdmin) throw new AdminUserError("cannot_remove_own_admin_access", 409);
}

async function userTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  // Serializable plus retry prevents concurrent removals from defeating the last-admin check.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
      if (error.code === "P2002") throw new AdminUserError("email_exists", 409);
      if (error.code === "P2025") throw new AdminUserError("not_found", 404);
      if (error.code !== "P2034") throw error;
    }
  }
  throw new AdminUserError("user_change_conflict", 409);
}

export async function updateManagedUser(actorId: string, id: string, data: UserUpdate) {
  return userTransaction(async (tx) => {
    await guardUserChange(tx, actorId, id, data);
    return tx.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
  });
}

export async function deleteManagedUser(actorId: string, id: string) {
  return userTransaction(async (tx) => {
    await guardUserChange(tx, actorId, id, null);
    await tx.user.delete({ where: { id } });
  });
}
