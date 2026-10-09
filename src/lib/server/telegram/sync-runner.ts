import "server-only";

import { expireTelegramLinkTokens } from "@/lib/server/telegram/link-tokens";
import {
  processTelegramSyncJobs,
  sweepDueTelegramMemberships,
} from "@/lib/server/telegram/sync";

export const TELEGRAM_EXPIRED_TOKEN_BATCH = 100;
export const TELEGRAM_SYNC_JOB_BATCH = 25;
export const TELEGRAM_DUE_MEMBERSHIP_BATCH = 50;

export async function runTelegramSync() {
  const expiredTokens = await expireTelegramLinkTokens(TELEGRAM_EXPIRED_TOKEN_BATCH);
  const queued = await processTelegramSyncJobs(TELEGRAM_SYNC_JOB_BATCH);
  const due = await sweepDueTelegramMemberships(TELEGRAM_DUE_MEMBERSHIP_BATCH);
  return { expiredTokens, queued, due };
}
