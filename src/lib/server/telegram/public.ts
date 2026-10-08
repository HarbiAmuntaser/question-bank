import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { getTelegramRuntimeConfig } from "@/lib/server/telegram/config";

export const telegramSubjectIsAvailable = cache(async (subjectId: string) => {
  if (!getTelegramRuntimeConfig().enabled) return false;
  const channel = await prisma.telegramSubjectChannel.findFirst({
    where: {
      subjectId,
      isEnabled: true,
      status: "connected",
      botCanInviteUsers: true,
      botCanRestrictMembers: true,
    },
    select: { id: true },
  });
  return Boolean(channel);
});