import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { applyTelegramBotMembershipUpdate } from "@/lib/server/telegram/admin-connect";
import { callTelegramApi } from "@/lib/server/telegram/api";
import { appendTelegramAuditEvent } from "@/lib/server/telegram/audit";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import { claimTelegramLinkToken } from "@/lib/server/telegram/link-tokens";
import {
  handleTelegramJoinRequest,
  handleTelegramMemberUpdate,
} from "@/lib/server/telegram/membership-events";
import { completeTelegramStudentLink } from "@/lib/server/telegram/membership";
import { reconcileTelegramMembership } from "@/lib/server/telegram/sync";
import { telegramTransaction } from "@/lib/server/telegram/transaction";

const START_COMMAND = /^\/start(?:@[A-Za-z][A-Za-z0-9_]{4,31})?\s+([A-Za-z0-9_-]{1,64})$/;
const UPDATE_ID = /^[0-9]{1,32}$/;
const USER_ID = /^[1-9][0-9]{0,19}$/;

type TelegramUser = { id?: number };
type TelegramChat = { id?: number; type?: string; title?: string; username?: string };
type TelegramMember = {
  status?: string;
  user?: TelegramUser;
  can_invite_users?: boolean;
  can_restrict_members?: boolean;
  is_member?: boolean;
};
type TelegramUpdate = {
  update_id?: number;
  message?: { text?: string; from?: TelegramUser; chat?: TelegramChat };
  my_chat_member?: {
    from?: TelegramUser;
    chat?: TelegramChat;
    new_chat_member?: TelegramMember;
  };
  chat_join_request?: {
    from?: TelegramUser;
    chat?: TelegramChat;
    invite_link?: { invite_link?: string };
  };
  chat_member?: {
    from?: TelegramUser;
    chat?: TelegramChat;
    new_chat_member?: TelegramMember;
  };
};

function stringId(value: number | undefined) {
  return Number.isSafeInteger(value) ? String(value) : "";
}

function isDuplicateError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function alreadyProcessed(updateId: string) {
  return Boolean(await prisma.telegramAuditEvent.findUnique({
    where: { telegramUpdateId: updateId },
    select: { id: true },
  }));
}

async function recordWebhookEvent(input: {
  updateId: string;
  eventType: string;
  idempotencyKey: string;
  telegramUserId?: string | null;
  actorUserId?: string | null;
  actorType?: "admin" | "telegram";
  linkTokenId?: string | null;
  metadata?: Prisma.InputJsonObject;
}) {
  try {
    await telegramTransaction((tx) => appendTelegramAuditEvent(tx, {
      eventType: input.eventType,
      actorType: input.actorType ?? "telegram",
      actorUserId: input.actorUserId,
      telegramUserId: input.telegramUserId,
      linkTokenId: input.linkTokenId,
      telegramUpdateId: input.updateId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    }));
    return true;
  } catch (error) {
    if (isDuplicateError(error)) return false;
    throw error;
  }
}

async function handleStart(updateId: string, message: NonNullable<TelegramUpdate["message"]>) {
  const telegramUserId = stringId(message.from?.id);
  if (!USER_ID.test(telegramUserId) || message.chat?.type !== "private") {
    throw new TelegramAccessError("telegram_update_invalid");
  }
  const match = message.text?.trim().match(START_COMMAND);
  if (!match) {
    await recordWebhookEvent({
      updateId,
      eventType: "webhook_update_ignored",
      telegramUserId,
      idempotencyKey: "update-ignored:" + updateId,
      metadata: { updateType: "message" },
    });
    return { outcome: "ignored" as const };
  }
  try {
    const claimed = await claimTelegramLinkToken({
      rawToken: match[1],
      telegramUserId,
    });
    if (claimed.purpose === "admin_connect") {
      await callTelegramApi("sendMessage", {
        chat_id: telegramUserId,
        text: "Telegram identity verified. Add this bot as an administrator to one private channel and grant Invite Users and Restrict Members permissions.",
      });
      await recordWebhookEvent({
        updateId,
        eventType: "admin_connect_instructions_sent",
        actorType: "admin",
        actorUserId: claimed.userId,
        telegramUserId,
        linkTokenId: claimed.id,
        idempotencyKey: "admin-instructions:" + updateId,
        metadata: { subjectId: claimed.subjectId },
      });
      return { outcome: "admin_identity_verified" as const };
    }

    const linked = await completeTelegramStudentLink({
      tokenId: claimed.id,
      telegramUserId,
      telegramUpdateId: updateId,
    });
    try {
      await reconcileTelegramMembership(
        linked.membership.id,
        "webhook-link:" + updateId,
      );
    } catch {
      // The durable sync job created with the membership handles transient Telegram failures.
    }
    return { outcome: "student_linked" as const, membershipId: linked.membership.id };
  } catch (error) {
    if (!(error instanceof TelegramAccessError) || error.status >= 500) throw error;
    await callTelegramApi("sendMessage", {
      chat_id: telegramUserId,
      text: "This link is invalid, expired, or no longer has access. Request a new link from Mustawak.",
    });
    await recordWebhookEvent({
      updateId,
      eventType: "webhook_update_rejected",
      telegramUserId,
      idempotencyKey: "update-rejected:" + updateId,
      metadata: { errorCode: error.code, updateType: "start" },
    });
    return { outcome: "rejected" as const };
  }
}

export function parseTelegramWebhookUpdate(value: unknown): TelegramUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TelegramAccessError("telegram_update_invalid");
  }
  const update = value as TelegramUpdate;
  const updateId = stringId(update.update_id);
  if (!UPDATE_ID.test(updateId)) throw new TelegramAccessError("telegram_update_invalid");
  return update;
}

export async function handleTelegramWebhookUpdate(raw: unknown) {
  const update = parseTelegramWebhookUpdate(raw);
  const updateId = stringId(update.update_id);
  if (await alreadyProcessed(updateId)) return { outcome: "duplicate" as const };

  try {
    if (update.message) return await handleStart(updateId, update.message);

    if (update.my_chat_member) {
      const event = update.my_chat_member;
      const actorTelegramUserId = stringId(event.from?.id);
      const chatId = stringId(event.chat?.id);
      const memberUserId = stringId(event.new_chat_member?.user?.id);
      const result = await applyTelegramBotMembershipUpdate({
        updateId,
        actorTelegramUserId,
        chatId,
        chatType: event.chat?.type ?? "",
        chatTitle: event.chat?.title?.trim() ?? "",
        chatUsername: event.chat?.username?.trim() || null,
        memberUserId,
        memberStatus: event.new_chat_member?.status ?? "",
        canInviteUsers: event.new_chat_member?.can_invite_users === true,
        canRestrictMembers: event.new_chat_member?.can_restrict_members === true,
      });
      if (result.outcome === "ignored") {
        await recordWebhookEvent({
          updateId,
          eventType: "webhook_update_ignored",
          telegramUserId: actorTelegramUserId,
          idempotencyKey: "update-ignored:" + updateId,
          metadata: { updateType: "my_chat_member" },
        });
      }
      return result;
    }

    if (update.chat_join_request) {
      const event = update.chat_join_request;
      return await handleTelegramJoinRequest({
        updateId,
        chatId: stringId(event.chat?.id),
        telegramUserId: stringId(event.from?.id),
        inviteLink: event.invite_link?.invite_link ?? null,
      });
    }

    if (update.chat_member) {
      const event = update.chat_member;
      const telegramUserId = stringId(event.new_chat_member?.user?.id);
      const result = await handleTelegramMemberUpdate({
        updateId,
        chatId: stringId(event.chat?.id),
        telegramUserId,
        memberStatus: event.new_chat_member?.status ?? "",
        isMember: event.new_chat_member?.is_member,
      });
      if (["ignored", "removed_without_access"].includes(result.outcome)) {
        await recordWebhookEvent({
          updateId,
          eventType: result.outcome === "ignored"
            ? "webhook_update_ignored"
            : "member_removed_without_access",
          telegramUserId,
          idempotencyKey: (result.outcome === "ignored" ? "update-ignored:" : "member-removed:") + updateId,
          metadata: { updateType: "chat_member" },
        });
      }
      return result;
    }

    await recordWebhookEvent({
      updateId,
      eventType: "webhook_update_ignored",
      idempotencyKey: "update-ignored:" + updateId,
      metadata: { updateType: "unsupported" },
    });
    return { outcome: "ignored" as const };
  } catch (error) {
    if (isDuplicateError(error) || await alreadyProcessed(updateId)) {
      return { outcome: "duplicate" as const };
    }
    throw error;
  }
}