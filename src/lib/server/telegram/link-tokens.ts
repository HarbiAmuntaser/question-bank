import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Prisma, type TelegramLinkToken } from "@prisma/client";

import { paymentSubjectWhere } from "@/lib/server/payment-scope";
import { appendTelegramAuditEvent } from "@/lib/server/telegram/audit";
import {
  getTelegramRuntimeConfig,
  TELEGRAM_LINK_TOKEN_TTL_SECONDS,
} from "@/lib/server/telegram/config";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import {
  resolveTelegramAccountAccess,
  resolveTelegramGuestAccess,
} from "@/lib/server/telegram/access";
import { telegramTransaction } from "@/lib/server/telegram/transaction";

const LINK_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const TELEGRAM_USER_ID = /^[1-9][0-9]{0,19}$/;

type AccountIdentity = { id: string; sessionVersion: number };
type StudentPrincipal =
  | { type: "account"; user: AccountIdentity }
  | { type: "guest_grant"; codeAccessGrantId: string };

function requireTelegramRuntime() {
  const config = getTelegramRuntimeConfig();
  if (!config.enabled || !config.botUsername) {
    throw new TelegramAccessError("telegram_access_unavailable", 503);
  }
  return config;
}

function generateLinkToken() {
  return randomBytes(32).toString("base64url");
}

export function hashTelegramLinkToken(value: string) {
  if (!LINK_TOKEN.test(value)) throw new TelegramAccessError("telegram_link_invalid", 404);
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function telegramBotStartUrl(rawToken: string, botUsername?: string) {
  if (!LINK_TOKEN.test(rawToken)) throw new TelegramAccessError("telegram_link_invalid");
  const username = botUsername ?? requireTelegramRuntime().botUsername!;
  return "https://t.me/" + username + "?start=" + rawToken;
}

async function databaseNow(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ now: Date }>>(
    Prisma.sql`SELECT clock_timestamp() AS now`,
  );
  return rows[0].now;
}

async function retireExpiredActiveToken(
  tx: Prisma.TransactionClient,
  activeKey: string,
  now: Date,
) {
  const existing = await tx.telegramLinkToken.findUnique({ where: { activeKey } });
  if (!existing) return;
  if (existing.expiresAt > now) {
    throw new TelegramAccessError(
      existing.purpose === "admin_connect"
        ? "telegram_admin_connect_pending"
        : "telegram_student_link_pending",
      409,
    );
  }
  await tx.telegramLinkToken.update({
    where: { id: existing.id },
    data: { state: "expired", activeKey: null },
  });
  await appendTelegramAuditEvent(tx, {
    eventType: "link_expired",
    actorType: "system",
    channelId: existing.channelId,
    linkTokenId: existing.id,
    idempotencyKey: "link-expired:" + existing.id,
    metadata: { purpose: existing.purpose },
  });
}

function issuedResult(token: TelegramLinkToken, rawToken: string, botUsername: string) {
  return {
    id: token.id,
    purpose: token.purpose,
    expiresAt: token.expiresAt,
    rawToken,
    startUrl: telegramBotStartUrl(rawToken, botUsername),
  };
}

export async function issueTelegramAdminConnectToken(input: {
  subjectId: string;
  admin: AccountIdentity;
}) {
  const config = requireTelegramRuntime();
  const rawToken = generateLinkToken();
  const tokenHash = hashTelegramLinkToken(rawToken);
  return telegramTransaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM users WHERE id = ${input.admin.id} FOR UPDATE`,
    );
    const [admin, subject, channel] = await Promise.all([
      tx.user.findUnique({
        where: { id: input.admin.id },
        select: { role: true, isActive: true, sessionVersion: true },
      }),
      tx.subject.findFirst({
        where: { id: input.subjectId, ...paymentSubjectWhere() },
        select: { id: true },
      }),
      tx.telegramSubjectChannel.findUnique({
        where: { subjectId: input.subjectId },
        select: { id: true },
      }),
    ]);
    if (!admin?.isActive || admin.role !== "admin" ||
      admin.sessionVersion !== input.admin.sessionVersion) {
      throw new TelegramAccessError("telegram_admin_forbidden", 403);
    }
    if (!subject) throw new TelegramAccessError("telegram_subject_unavailable", 409);
    if (channel) throw new TelegramAccessError("telegram_channel_already_connected", 409);
    const now = await databaseNow(tx);
    const activeKey = "admin:" + input.admin.id;
    await retireExpiredActiveToken(tx, activeKey, now);
    const token = await tx.telegramLinkToken.create({
      data: {
        tokenHash,
        purpose: "admin_connect",
        activeKey,
        subjectId: input.subjectId,
        userId: input.admin.id,
        userSessionVersion: input.admin.sessionVersion,
        expiresAt: new Date(now.getTime() + TELEGRAM_LINK_TOKEN_TTL_SECONDS * 1000),
        createdAt: now,
        updatedAt: now,
      },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "admin_connect_started",
      actorType: "admin",
      actorUserId: input.admin.id,
      linkTokenId: token.id,
      idempotencyKey: "link-issued:" + token.id,
      metadata: { subjectId: input.subjectId },
    });
    return issuedResult(token, rawToken, config.botUsername!);
  });
}

export async function issueTelegramStudentLinkToken(input: {
  subjectId: string;
  principal: StudentPrincipal;
}) {
  const config = requireTelegramRuntime();
  const rawToken = generateLinkToken();
  const tokenHash = hashTelegramLinkToken(rawToken);
  return telegramTransaction(async (tx) => {
    const channel = await tx.telegramSubjectChannel.findFirst({
      where: {
        subjectId: input.subjectId,
        isEnabled: true,
        status: "connected",
        botCanInviteUsers: true,
        botCanRestrictMembers: true,
      },
    });
    if (!channel) throw new TelegramAccessError("telegram_channel_unavailable", 409);
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM telegram_subject_channels WHERE id = ${channel.id} FOR UPDATE`,
    );
    const access = input.principal.type === "account"
      ? await resolveTelegramAccountAccess({
        userId: input.principal.user.id,
        subjectId: input.subjectId,
      }, tx)
      : await resolveTelegramGuestAccess({
        codeAccessGrantId: input.principal.codeAccessGrantId,
        subjectId: input.subjectId,
      }, tx);
    if (!access.allowed) throw new TelegramAccessError("telegram_access_required", 403);

    if (input.principal.type === "account") {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM users WHERE id = ${input.principal.user.id} FOR UPDATE`,
      );
      const user = await tx.user.findUnique({
        where: { id: input.principal.user.id },
        select: { sessionVersion: true },
      });
      if (user?.sessionVersion !== input.principal.user.sessionVersion) {
        throw new TelegramAccessError("telegram_account_session_invalid", 401);
      }
    } else {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM code_access_grants WHERE id = ${input.principal.codeAccessGrantId} FOR UPDATE`,
      );
    }

    const now = await databaseNow(tx);
    const activeKey = input.principal.type === "account"
      ? "student-account:" + channel.id + ":" + input.principal.user.id
      : "student-guest:" + channel.id + ":" + input.principal.codeAccessGrantId;
    await retireExpiredActiveToken(tx, activeKey, now);
    const token = await tx.telegramLinkToken.create({
      data: {
        tokenHash,
        purpose: "student_link",
        activeKey,
        subjectId: input.subjectId,
        channelId: channel.id,
        userId: input.principal.type === "account" ? input.principal.user.id : null,
        userSessionVersion: input.principal.type === "account"
          ? input.principal.user.sessionVersion
          : null,
        codeAccessGrantId: input.principal.type === "guest_grant"
          ? input.principal.codeAccessGrantId
          : null,
        expiresAt: new Date(now.getTime() + TELEGRAM_LINK_TOKEN_TTL_SECONDS * 1000),
        createdAt: now,
        updatedAt: now,
      },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "student_link_issued",
      actorType: input.principal.type === "account" ? "account" : "guest",
      actorUserId: input.principal.type === "account" ? input.principal.user.id : null,
      channelId: channel.id,
      linkTokenId: token.id,
      idempotencyKey: "link-issued:" + token.id,
      metadata: {
        subjectId: input.subjectId,
        principalType: input.principal.type,
        accessExpiresAt: access.expiresAt?.toISOString() ?? null,
      },
    });
    return issuedResult(token, rawToken, config.botUsername!);
  });
}

async function recheckTokenAccess(tx: Prisma.TransactionClient, token: TelegramLinkToken) {
  if (token.purpose === "admin_connect") {
    const admin = await tx.user.findUnique({
      where: { id: token.userId! },
      select: { role: true, isActive: true, sessionVersion: true },
    });
    return Boolean(admin?.isActive && admin.role === "admin" &&
      admin.sessionVersion === token.userSessionVersion);
  }
  const decision = token.userId
    ? await resolveTelegramAccountAccess({
      userId: token.userId,
      subjectId: token.subjectId,
    }, tx)
    : await resolveTelegramGuestAccess({
      codeAccessGrantId: token.codeAccessGrantId!,
      subjectId: token.subjectId,
    }, tx);
  return decision.allowed;
}

export async function claimTelegramLinkToken(input: {
  rawToken: string;
  telegramUserId: string;
}) {
  requireTelegramRuntime();
  if (!TELEGRAM_USER_ID.test(input.telegramUserId)) {
    throw new TelegramAccessError("telegram_user_invalid");
  }
  const tokenHash = hashTelegramLinkToken(input.rawToken);
  return telegramTransaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM telegram_link_tokens WHERE "tokenHash" = ${tokenHash} FOR UPDATE`,
    );
    const token = await tx.telegramLinkToken.findUnique({ where: { tokenHash } });
    const now = await databaseNow(tx);
    if (!token || token.expiresAt <= now || !["pending", "claimed"].includes(token.state)) {
      throw new TelegramAccessError("telegram_link_invalid", 404);
    }
    if (token.state === "claimed" && token.telegramUserId !== input.telegramUserId) {
      throw new TelegramAccessError("telegram_link_invalid", 404);
    }
    if (!await recheckTokenAccess(tx, token)) {
      throw new TelegramAccessError("telegram_access_required", 403);
    }
    const alreadyClaimed = token.state === "claimed";
    const claimed = alreadyClaimed ? token : await tx.telegramLinkToken.update({
      where: { id: token.id },
      data: {
        state: "claimed",
        telegramUserId: input.telegramUserId,
        claimedAt: now,
      },
    });
    if (!alreadyClaimed) {
      await appendTelegramAuditEvent(tx, {
        eventType: token.purpose === "admin_connect"
          ? "admin_identity_linked"
          : "student_identity_linked",
        actorType: "telegram",
        telegramUserId: input.telegramUserId,
        channelId: token.channelId,
        linkTokenId: token.id,
        idempotencyKey: "link-claimed:" + token.id,
        metadata: { purpose: token.purpose, subjectId: token.subjectId },
      });
    }
    return {
      id: claimed.id,
      purpose: claimed.purpose,
      subjectId: claimed.subjectId,
      channelId: claimed.channelId,
      userId: claimed.userId,
      codeAccessGrantId: claimed.codeAccessGrantId,
      telegramUserId: claimed.telegramUserId!,
      expiresAt: claimed.expiresAt,
      alreadyClaimed,
    };
  });
}
export async function consumeTelegramLinkToken(input: {
  tokenId: string;
  telegramUserId: string;
  idempotencyKey: string;
}) {
  requireTelegramRuntime();
  if (!TELEGRAM_USER_ID.test(input.telegramUserId)) {
    throw new TelegramAccessError("telegram_user_invalid");
  }
  return telegramTransaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM telegram_link_tokens WHERE id = ${input.tokenId} FOR UPDATE`,
    );
    const token = await tx.telegramLinkToken.findUnique({ where: { id: input.tokenId } });
    const now = await databaseNow(tx);
    if (!token || token.telegramUserId !== input.telegramUserId || token.expiresAt <= now) {
      throw new TelegramAccessError("telegram_link_invalid", 404);
    }
    if (token.state === "consumed") return { alreadyConsumed: true, tokenId: token.id };
    if (token.state !== "claimed" || !await recheckTokenAccess(tx, token)) {
      throw new TelegramAccessError("telegram_access_required", 403);
    }
    await tx.telegramLinkToken.update({
      where: { id: token.id },
      data: { state: "consumed", activeKey: null, consumedAt: now },
    });
    await appendTelegramAuditEvent(tx, {
      eventType: "link_consumed",
      actorType: "telegram",
      telegramUserId: input.telegramUserId,
      channelId: token.channelId,
      linkTokenId: token.id,
      idempotencyKey: input.idempotencyKey,
      metadata: { purpose: token.purpose, subjectId: token.subjectId },
    });
    return { alreadyConsumed: false, tokenId: token.id };
  });
}
