import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { accessPlanSelect, serializeAccessPlan } from "@/lib/server/access-control";
import { lockPaymentUsers, refreshPaymentAccount } from "@/lib/server/payment-order-access";
import {
  PaymentError,
  recheckPaymentStudent,
  requirePaymentCodePlan,
  requirePaymentCodes,
  requirePaymentSubject,
} from "@/lib/server/payment-scope";
import { paymentTransaction } from "@/lib/server/payment-transaction";
import {
  generateGuestAccessToken,
  hashGuestAccessToken,
  hashSubscriptionCode,
  isGuestAccessToken,
  normalizeSubscriptionCode,
} from "@/lib/server/subscription-code";

const DAY_MS = 86_400_000;
const TRANSFER_INTERVAL_MS = 10 * 60_000;
const TRANSFER_WINDOW_MS = 24 * 60 * 60_000;
const MAX_TRANSFERS_PER_WINDOW = 3;
const CODE_ACCESS_TRANSACTION = { maxWait: 5_000, timeout: 20_000 } as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type AccountIdentity = { id: string; sessionVersion: number };
type GuestPrincipal = { type: "guest"; sessionToken?: string | null };
type AccountPrincipal = { type: "account"; user: AccountIdentity };
type AdminOverride = { user: AccountIdentity };

export type CodeAccessActivationInput = {
  code: string;
  subjectId: string;
  idempotencyKey: string;
  operation?: "activate" | "recover" | "transfer";
  principal: AccountPrincipal | GuestPrincipal;
  adminOverride?: AdminOverride;
};

function inputHash(input: CodeAccessActivationInput, codeHash: string, sessionHash: string | null) {
  return createHash("sha256").update(JSON.stringify({
    codeHash,
    subjectId: input.subjectId,
    operation: input.operation ?? "activate",
    principalType: input.principal.type,
    principalId: input.principal.type === "account" ? input.principal.user.id : null,
    sessionHash,
    adminOverrideId: input.adminOverride?.user.id ?? null,
  })).digest("hex");
}

function validateInput(input: CodeAccessActivationInput) {
  if (!input.subjectId.trim() || input.subjectId.length > 100 || !UUID.test(input.idempotencyKey)) {
    throw new PaymentError("invalid_code_access_request");
  }
  if (input.principal.type === "guest" && input.principal.sessionToken && !isGuestAccessToken(input.principal.sessionToken)) {
    throw new PaymentError("invalid_guest_session");
  }
  if (input.adminOverride && (input.principal.type !== "guest" || input.operation !== "transfer")) {
    throw new PaymentError("invalid_code_access_request");
  }
}

async function databaseNow(tx: Prisma.TransactionClient) {
  const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  return clock.now;
}

async function recheckAdminOverride(tx: Prisma.TransactionClient, identity: AccountIdentity) {
  const user = await tx.user.findUnique({
    where: { id: identity.id },
    select: { role: true, isActive: true, sessionVersion: true },
  });
  if (!user?.isActive || user.role !== "admin" || user.sessionVersion !== identity.sessionVersion) {
    throw new PaymentError("forbidden", 403);
  }
}

function eventActor(input: CodeAccessActivationInput, sessionId: string | null) {
  if (input.adminOverride) {
    return { actorType: "admin" as const, actorUserId: input.adminOverride.user.id,
      actorSessionVersion: input.adminOverride.user.sessionVersion, sessionId };
  }
  if (input.principal.type === "account") {
    return { actorType: "account" as const, actorUserId: input.principal.user.id,
      actorSessionVersion: input.principal.user.sessionVersion, sessionId: null };
  }
  return { actorType: "guest" as const, actorUserId: null, actorSessionVersion: null, sessionId };
}

async function sessionForToken(tx: Prisma.TransactionClient, tokenHash: string, expiresAt: Date, now: Date) {
  const existing = await tx.guestAccessSession.findUnique({ where: { tokenHash } });
  if (existing) {
    if (existing.revokedAt || existing.expiresAt <= now) throw new PaymentError("invalid_guest_session", 401);
    return tx.guestAccessSession.update({ where: { id: existing.id }, data: {
      lastSeenAt: now,
      ...(existing.expiresAt < expiresAt ? { expiresAt } : {}),
    } });
  }
  return tx.guestAccessSession.create({ data: {
    tokenHash, expiresAt, lastSeenAt: now, createdAt: now, updatedAt: now,
  } });
}

function result(grant: {
  id: string; subjectId: string; startsAt: Date; expiresAt: Date; principalType: "account" | "guest";
}, plan: Parameters<typeof serializeAccessPlan>[0], code: { codePreview: string | null; supportReference: string | null },
guestSessionToken: string | null, alreadyActive: boolean) {
  return {
    alreadyActive,
    grant,
    plan: serializeAccessPlan(plan),
    codePreview: code.codePreview,
    supportReference: code.supportReference,
    guestSessionToken,
  };
}

export async function activateCodeAccess(input: CodeAccessActivationInput) {
  requirePaymentCodes();
  validateInput(input);
  const normalized = normalizeSubscriptionCode(input.code);
  if (!normalized) throw new PaymentError("invalid_code");
  const codeHash = hashSubscriptionCode(normalized);
  const generatedToken = input.principal.type === "guest" && !input.principal.sessionToken ? generateGuestAccessToken() : null;
  const guestToken = input.principal.type === "guest" ? input.principal.sessionToken || generatedToken : null;
  const sessionHash = guestToken ? hashGuestAccessToken(guestToken) : null;
  const requestHash = inputHash(input, codeHash, sessionHash);

  return paymentTransaction(async (tx) => {
    requirePaymentCodes();
    await requirePaymentSubject(input.subjectId, tx);
    if (input.principal.type === "account") {
      await lockPaymentUsers(tx, [input.principal.user.id]);
      await recheckPaymentStudent(tx, input.principal.user);
      await refreshPaymentAccount(tx, input.principal.user.id);
    }
    if (input.adminOverride) {
      await lockPaymentUsers(tx, [input.adminOverride.user.id]);
      await recheckAdminOverride(tx, input.adminOverride.user);
    }

    const located = await tx.subscriptionCode.findUnique({ where: { codeHash }, select: { id: true } });
    if (!located) throw new PaymentError("invalid_code");
    await tx.$queryRaw`SELECT id FROM subscription_codes WHERE id = ${located.id} FOR UPDATE`;
    const code = await tx.subscriptionCode.findUniqueOrThrow({
      where: { id: located.id },
      include: { plan: { select: { ...accessPlanSelect, isActive: true, activationCodesEnabled: true, defaultDurationDays: true } } },
    });
    if (code.plan.scopeType !== "subject" || code.plan.majorId !== null || code.plan.subjectId !== input.subjectId) {
      throw new PaymentError("payment_target_mismatch", 409);
    }
    const now = await databaseNow(tx);
    const existing = await tx.codeAccessGrant.findUnique({ where: { codeId: code.id } });

    if (existing) {
      if (!existing.isActive || existing.revokedAt || existing.expiresAt <= now) throw new PaymentError("code_used");
      if (!code.isActive) throw new PaymentError("inactive_code");
      const replay = await tx.codeAccessEvent.findUnique({
        where: { grantId_idempotencyKey: { grantId: existing.id, idempotencyKey: input.idempotencyKey } },
      });
      if (replay && replay.requestHash !== requestHash) throw new PaymentError("payment_idempotency_conflict", 409);
      if (input.principal.type === "account") {
        if (existing.principalType !== "account" || existing.userId !== input.principal.user.id) throw new PaymentError("code_used");
        return result(existing, code.plan, code, null, true);
      }
      if (existing.principalType !== "guest" || !guestToken || !sessionHash) throw new PaymentError("code_used");
      const knownSession = await tx.guestAccessSession.findUnique({ where: { tokenHash: sessionHash } });
      if (knownSession) {
        const binding = await tx.codeAccessSessionBinding.findUnique({
          where: { grantId_sessionId: { grantId: existing.id, sessionId: knownSession.id } },
        });
        if (binding && !binding.revokedAt && !knownSession.revokedAt && knownSession.expiresAt > now) {
          await tx.guestAccessSession.update({ where: { id: knownSession.id }, data: { lastSeenAt: now } });
          await tx.codeAccessSessionBinding.update({ where: { id: binding.id }, data: { lastUsedAt: now } });
          return result(existing, code.plan, code, guestToken, true);
        }
        if (binding?.revokedAt) throw new PaymentError("session_revoked", 409);
      }
      if (replay) throw new PaymentError("payment_idempotency_replay", 409);

      const session = await sessionForToken(tx, sessionHash, existing.expiresAt, now);
      const activeBindings = await tx.codeAccessSessionBinding.findMany({
        where: { grantId: existing.id, revokedAt: null }, orderBy: [{ lastUsedAt: "asc" }, { id: "asc" }],
      });
      if (activeBindings.length < code.maxBrowserSessions) {
        await tx.codeAccessSessionBinding.create({ data: { grantId: existing.id, sessionId: session.id, boundAt: now, lastUsedAt: now } });
        await tx.codeAccessEvent.create({ data: {
          grantId: existing.id, codeId: code.id, type: "session_recovered", ...eventActor(input, session.id),
          idempotencyKey: input.idempotencyKey, requestHash, metadata: { activeSessions: activeBindings.length + 1 },
        } });
        return result(existing, code.plan, code, guestToken, true);
      }
      if (input.operation !== "transfer") throw new PaymentError("browser_limit_reached", 409);

      const since = new Date(now.getTime() - TRANSFER_WINDOW_MS);
      const transfers = await tx.codeAccessEvent.findMany({
        where: { grantId: existing.id, type: "session_transferred", actorType: "guest", createdAt: { gt: since } },
        orderBy: { createdAt: "desc" }, select: { createdAt: true },
      });
      if (!input.adminOverride) {
        if (transfers.length >= MAX_TRANSFERS_PER_WINDOW) throw new PaymentError("transfer_support_required", 429);
        if (transfers[0] && now.getTime() - transfers[0].createdAt.getTime() < TRANSFER_INTERVAL_MS) {
          throw new PaymentError("transfer_too_soon", 429);
        }
      }
      const replaced = activeBindings[0];
      await tx.codeAccessSessionBinding.update({ where: { id: replaced.id }, data: { revokedAt: now } });
      await tx.codeAccessSessionBinding.create({ data: {
        grantId: existing.id, sessionId: session.id, boundAt: now, lastUsedAt: now,
      } });
      await tx.codeAccessEvent.create({ data: {
        grantId: existing.id, codeId: code.id, type: "session_transferred", ...eventActor(input, session.id),
        replacedSessionId: replaced.sessionId, idempotencyKey: input.idempotencyKey, requestHash,
        metadata: { adminOverride: Boolean(input.adminOverride) },
      } });
      return result(existing, code.plan, code, guestToken, true);
    }

    requirePaymentCodePlan(code.planId, code.plan.activationCodesEnabled);
    if (!code.plan.isActive) throw new PaymentError("inactive_plan");
    if (!code.isActive) throw new PaymentError("inactive_code");
    if (code.startsAt && code.startsAt > now) throw new PaymentError("code_not_started");
    if (code.expiresAt && code.expiresAt <= now) throw new PaymentError("code_expired");
    if (code.usedCount > 0 || await tx.accessEntitlement.count({ where: { codeId: code.id } })) throw new PaymentError("code_used");
    const days = code.durationDays ?? code.plan.defaultDurationDays;
    if (!Number.isInteger(days) || days! < 1 || days! > 36500) throw new PaymentError("invalid_code_window", 409);
    const expiresAt = new Date(now.getTime() + days! * DAY_MS);

    if (input.principal.type === "account") {
      const activeAccess = await tx.accessEntitlement.findFirst({ where: {
        userId: input.principal.user.id, subjectId: input.subjectId, scopeType: "subject", isActive: true,
        startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      }, select: { id: true } });
      const activeGrant = await tx.codeAccessGrant.findFirst({ where: {
        userId: input.principal.user.id, subjectId: input.subjectId, principalType: "account", isActive: true,
        startsAt: { lte: now }, expiresAt: { gt: now },
      }, select: { id: true } });
      if (activeAccess || activeGrant) throw new PaymentError("active_entitlement_exists", 409);
      const grant = await tx.codeAccessGrant.create({ data: {
        codeId: code.id, planId: code.planId, subjectId: input.subjectId, principalType: "account",
        userId: input.principal.user.id, startsAt: now, expiresAt,
      } });
      await tx.codeAccessEvent.create({ data: {
        grantId: grant.id, codeId: code.id, type: "activated", ...eventActor(input, null),
        idempotencyKey: input.idempotencyKey, requestHash, metadata: { durationDays: days! },
      } });
      return result(grant, code.plan, code, null, false);
    }

    if (!guestToken || !sessionHash) throw new PaymentError("invalid_guest_session");
    const priorSession = await tx.guestAccessSession.findUnique({ where: { tokenHash: sessionHash }, select: { id: true } });
    if (priorSession) {
      const activeGrant = await tx.codeAccessGrant.findFirst({ where: {
        principalType: "guest", subjectId: input.subjectId, isActive: true, expiresAt: { gt: now },
        sessions: { some: { sessionId: priorSession.id, revokedAt: null } },
      }, select: { id: true } });
      if (activeGrant) throw new PaymentError("active_entitlement_exists", 409);
    }
    const grant = await tx.codeAccessGrant.create({ data: {
      codeId: code.id, planId: code.planId, subjectId: input.subjectId, principalType: "guest",
      startsAt: now, expiresAt,
    } });
    const session = await sessionForToken(tx, sessionHash, expiresAt, now);
    await tx.codeAccessSessionBinding.create({ data: { grantId: grant.id, sessionId: session.id, boundAt: now, lastUsedAt: now } });
    await tx.codeAccessEvent.create({ data: {
      grantId: grant.id, codeId: code.id, type: "activated", ...eventActor(input, session.id),
      idempotencyKey: input.idempotencyKey, requestHash, metadata: { durationDays: days! },
    } });
    return result(grant, code.plan, code, guestToken, false);
  }, CODE_ACCESS_TRANSACTION);
}

export const codeAccessTransferPolicy = {
  firstTransferImmediate: true,
  minimumIntervalMinutes: TRANSFER_INTERVAL_MS / 60_000,
  maximumTransfers: MAX_TRANSFERS_PER_WINDOW,
  windowHours: TRANSFER_WINDOW_MS / 3_600_000,
} as const;

function adminMutationHash(value: object) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validateAdminMutation(actor: AccountIdentity, idempotencyKey: string, reason: string) {
  if (!actor.id || !UUID.test(idempotencyKey) || reason.trim().length < 5 || reason.trim().length > 1000) {
    throw new PaymentError("invalid_code_access_request");
  }
}

export async function changeCodeBrowserLimit(input: {
  codeId: string; maxBrowserSessions: number; idempotencyKey: string; reason: string; actor: AccountIdentity;
}) {
  validateAdminMutation(input.actor, input.idempotencyKey, input.reason);
  if (!Number.isInteger(input.maxBrowserSessions) || input.maxBrowserSessions < 1 || input.maxBrowserSessions > 100) {
    throw new PaymentError("invalid_browser_limit");
  }
  const requestHash = adminMutationHash({ codeId: input.codeId, maxBrowserSessions: input.maxBrowserSessions, reason: input.reason.trim() });
  return paymentTransaction(async (tx) => {
    await lockPaymentUsers(tx, [input.actor.id]);
    await recheckAdminOverride(tx, input.actor);
    await tx.$queryRaw`SELECT id FROM subscription_codes WHERE id = ${input.codeId} FOR UPDATE`;
    const code = await tx.subscriptionCode.findUnique({ where: { id: input.codeId }, include: { accessGrant: true } });
    if (!code) throw new PaymentError("not_found", 404);
    if (!code.accessGrant) throw new PaymentError("code_not_activated", 409);
    const replay = await tx.codeAccessEvent.findUnique({
      where: { grantId_idempotencyKey: { grantId: code.accessGrant.id, idempotencyKey: input.idempotencyKey } },
    });
    if (replay) {
      if (replay.requestHash !== requestHash) throw new PaymentError("payment_idempotency_conflict", 409);
      return { alreadyChanged: true, maxBrowserSessions: code.maxBrowserSessions };
    }
    if (code.maxBrowserSessions === input.maxBrowserSessions) return { alreadyChanged: true, maxBrowserSessions: code.maxBrowserSessions };
    const updated = await tx.subscriptionCode.update({ where: { id: code.id }, data: { maxBrowserSessions: input.maxBrowserSessions } });
    await tx.codeAccessEvent.create({ data: {
      grantId: code.accessGrant.id, codeId: code.id, type: "browser_limit_changed", actorType: "admin",
      actorUserId: input.actor.id, actorSessionVersion: input.actor.sessionVersion,
      idempotencyKey: input.idempotencyKey, requestHash,
      metadata: { before: code.maxBrowserSessions, after: updated.maxBrowserSessions, reason: input.reason.trim() },
    } });
    return { alreadyChanged: false, maxBrowserSessions: updated.maxBrowserSessions };
  }, CODE_ACCESS_TRANSACTION);
}

export async function revokeCodeAccessGrant(input: {
  grantId: string; idempotencyKey: string; reason: string; actor: AccountIdentity;
}) {
  validateAdminMutation(input.actor, input.idempotencyKey, input.reason);
  const requestHash = adminMutationHash({ grantId: input.grantId, reason: input.reason.trim() });
  return paymentTransaction(async (tx) => {
    await lockPaymentUsers(tx, [input.actor.id]);
    await recheckAdminOverride(tx, input.actor);
    await tx.$queryRaw`SELECT id FROM code_access_grants WHERE id = ${input.grantId} FOR UPDATE`;
    const grant = await tx.codeAccessGrant.findUnique({ where: { id: input.grantId } });
    if (!grant) throw new PaymentError("not_found", 404);
    const replay = await tx.codeAccessEvent.findUnique({
      where: { grantId_idempotencyKey: { grantId: grant.id, idempotencyKey: input.idempotencyKey } },
    });
    if (replay) {
      if (replay.requestHash !== requestHash) throw new PaymentError("payment_idempotency_conflict", 409);
      return { alreadyRevoked: true };
    }
    if (!grant.isActive) return { alreadyRevoked: true };
    const now = await databaseNow(tx);
    await tx.codeAccessGrant.update({ where: { id: grant.id }, data: { isActive: false, revokedAt: now } });
    await tx.codeAccessEvent.create({ data: {
      grantId: grant.id, codeId: grant.codeId, type: "grant_revoked", actorType: "admin",
      actorUserId: input.actor.id, actorSessionVersion: input.actor.sessionVersion,
      idempotencyKey: input.idempotencyKey, requestHash, metadata: { reason: input.reason.trim() },
    } });
    return { alreadyRevoked: false };
  }, CODE_ACCESS_TRANSACTION);
}
