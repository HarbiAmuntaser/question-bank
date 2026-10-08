import { z } from "zod";

import { adminAuthResponse, verifyAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { consumeAuthLimit, requestIdentity } from "@/lib/server/auth-rate-limit";
import {
  disconnectTelegramChannel,
  queueTelegramMassRemoval,
  queueTelegramMembershipRetry,
  setTelegramChannelEnabled,
  verifyTelegramChannelHealth,
} from "@/lib/server/telegram/admin-management";
import { TelegramAccessError } from "@/lib/server/telegram/errors";
import {
  telegramErrorResponse,
  telegramJson,
  readTelegramJson,
  requireTelegramOrigin,
} from "@/lib/server/telegram/http";
import { issueTelegramAdminConnectToken } from "@/lib/server/telegram/link-tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = z.string().uuid();
const reason = z.string().trim().min(5).max(1000);
const idempotencyKey = z.string().regex(/^[A-Za-z0-9:_-]{8,100}$/);
const timestamp = z.string().datetime();
const connectSchema = z.object({ subjectId: uuid }).strict();
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_enabled"),
    channelId: uuid,
    enabled: z.boolean(),
    expectedUpdatedAt: timestamp,
    idempotencyKey,
    reason,
  }).strict(),
  z.object({
    action: z.literal("verify_channel"),
    channelId: uuid,
    idempotencyKey,
  }).strict(),
  z.object({
    action: z.literal("retry_membership"),
    membershipId: uuid,
    idempotencyKey,
    reason,
  }).strict(),
  z.object({
    action: z.literal("mass_remove"),
    channelId: uuid,
    expectedUpdatedAt: timestamp,
    idempotencyKey,
    reason,
    confirmation: z.literal("REMOVE ALL TELEGRAM MEMBERS"),
  }).strict(),
  z.object({
    action: z.literal("disconnect"),
    channelId: uuid,
    expectedUpdatedAt: timestamp,
    idempotencyKey,
    reason,
    confirmation: z.literal("DISCONNECT TELEGRAM CHANNEL"),
  }).strict(),
]);

async function adminActor(userId: string) {
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true, sessionVersion: true },
  });
  if (!admin?.isActive || admin.role !== "admin") {
    throw new TelegramAccessError("telegram_admin_forbidden", 403);
  }
  return { id: admin.id, sessionVersion: admin.sessionVersion };
}

function boundedPage(raw: string | null) {
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 10_000) : 1;
}

export async function GET(request: Request) {
  const auth = await verifyAdmin(request, "subscriptions:manage");
  if (!auth.ok) return adminAuthResponse(auth);
  try {
    const url = new URL(request.url);
    const channelIdRaw = url.searchParams.get("channelId");
    if (channelIdRaw) {
      const channelId = uuid.parse(channelIdRaw);
      const page = boundedPage(url.searchParams.get("page"));
      const query = (url.searchParams.get("query") ?? "").trim().slice(0, 100);
      const membershipStatus = url.searchParams.get("status");
      const allowedStatuses = ["pending_join", "active", "left", "removal_pending", "removed", "error"];
      const status = membershipStatus && allowedStatuses.includes(membershipStatus)
        ? membershipStatus as "pending_join" | "active" | "left" | "removal_pending" | "removed" | "error"
        : null;
      const where = {
        channelId,
        ...(status ? { status } : {}),
        ...(query ? { OR: [
          { telegramUserId: { contains: query } },
          { user: { email: { contains: query, mode: "insensitive" as const } } },
          { codeAccessGrant: { code: { supportReference: { contains: query, mode: "insensitive" as const } } } },
        ] } : {}),
      };
      const [channel, total, memberships, events, jobs] = await Promise.all([
        prisma.telegramSubjectChannel.findUnique({
          where: { id: channelId },
          include: {
            subject: { select: {
              id: true,
              name: true,
              major: { select: {
                name: true,
                college: { select: { name: true } },
                university: { select: { name: true } },
              } },
            } },
            _count: { select: { memberships: true, syncJobs: true } },
          },
        }),
        prisma.telegramMembership.count({ where }),
        prisma.telegramMembership.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * 10,
          take: 10,
          include: {
            user: { select: { email: true } },
            codeAccessGrant: { select: {
              id: true,
              code: { select: { supportReference: true } },
            } },
          },
        }),
        prisma.telegramAuditEvent.findMany({
          where: { channelId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
          include: { actor: { select: { email: true } } },
        }),
        prisma.telegramSyncJob.findMany({
          where: { channelId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
        }),
      ]);
      if (!channel) throw new TelegramAccessError("telegram_channel_not_found", 404);
      return telegramJson({ data: {
        channel,
        memberships,
        events,
        jobs,
        pagination: {
          page,
          pageSize: 10,
          total,
          totalPages: Math.max(1, Math.ceil(total / 10)),
        },
      } });
    }

    const subjectId = uuid.parse(url.searchParams.get("subjectId"));
    const channel = await prisma.telegramSubjectChannel.findUnique({
      where: { subjectId },
      select: {
        id: true,
        subjectId: true,
        title: true,
        status: true,
        isEnabled: true,
        botCanInviteUsers: true,
        botCanRestrictMembers: true,
        verifiedAt: true,
        lastHealthCheckedAt: true,
        updatedAt: true,
      },
    });
    return telegramJson({ data: { channel } });
  } catch (error) {
    return telegramErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request, "subscriptions:manage");
  if (!auth.ok) return adminAuthResponse(auth);
  try {
    requireTelegramOrigin(request);
    const raw = await readTelegramJson(request, 16_384);
    await consumeAuthLimit("telegram-admin-ip", requestIdentity(request.headers), 40, 900);
    await consumeAuthLimit("telegram-admin-actor", auth.userId, 20, 600);
    const actor = await adminActor(auth.userId);

    const connect = connectSchema.safeParse(raw);
    if (connect.success) {
      const issued = await issueTelegramAdminConnectToken({
        subjectId: connect.data.subjectId,
        admin: actor,
      });
      return telegramJson({ data: { startUrl: issued.startUrl, expiresAt: issued.expiresAt } }, 201);
    }

    const input = actionSchema.parse(raw);
    if (input.action === "set_enabled") {
      const result = await setTelegramChannelEnabled({ ...input, actor });
      return telegramJson({ data: result });
    }
    if (input.action === "verify_channel") {
      const result = await verifyTelegramChannelHealth({ ...input, actor });
      return telegramJson({ data: result });
    }
    if (input.action === "retry_membership") {
      const result = await queueTelegramMembershipRetry({ ...input, actor });
      return telegramJson({ data: result }, 202);
    }
    if (input.action === "mass_remove") {
      const result = await queueTelegramMassRemoval({ ...input, actor });
      return telegramJson({ data: result }, 202);
    }
    const result = await disconnectTelegramChannel({ ...input, actor });
    return telegramJson({ data: result });
  } catch (error) {
    return telegramErrorResponse(error);
  }
}