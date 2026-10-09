# Telegram paid-subject access

Telegram access is an optional delivery channel for paid subjects. The database remains the source of truth for eligibility. Telegram membership never creates or extends an entitlement or code grant.

## Runtime configuration

All values are server-only:

- `TELEGRAM_ACCESS_ENABLED`: global release control. Keep `false` until rollout approval.
- `TELEGRAM_BOT_TOKEN`: token issued by BotFather.
- `TELEGRAM_BOT_USERNAME`: bot username without a required `@` prefix.
- `TELEGRAM_WEBHOOK_SECRET`: URL-safe random secret, at least 32 characters.
- `TELEGRAM_SYNC_SECRET`: separate URL-safe random secret for an operator-triggered POST, at least 32 characters.
- `CRON_SECRET`: separate URL-safe random secret used by Vercel Cron for the scheduled GET, at least 32 characters.
- `TELEGRAM_EXPIRY_MAX_DELAY_MINUTES`: internal membership recheck interval from 1 to 1440; use `1440` for the daily rollout.
- `NEXTAUTH_URL`: the canonical root HTTPS origin used to construct the webhook URL.

Run `npm run telegram:preflight` in a production-shaped environment. It validates shape only and never prints secret values. A pass still requires the live checks below.

Website authorization remains time-based and immediate: expired entitlements and grants stop website access even if Telegram removal waits for the next daily run.

## BotFather and private channel

1. Create a dedicated bot with BotFather, record its token, and set a username.
2. Keep the subject channel private. Public usernames are rejected.
3. From the admin Telegram tab, issue a one-time admin identity link and open the bot.
4. Add the bot separately to the intended private channel as an administrator.
5. Grant only the permissions required to create invite links and restrict/remove members.
6. Return to the admin tab, run the on-demand health check, then enable new linking.

The admin identity deep-link and adding the bot to a channel are separate operations. Only one pending admin connect request per admin is supported. Rebinding preserves channel, membership, job, and audit history and is blocked until memberships and outstanding jobs are settled.

## Webhook registration

After the deployment is ready and the feature remains closed, call Telegram `setWebhook` from a trusted operator environment:

- URL: `https://mustawak.com/api/v1/integrations/telegram/webhook`
- `secret_token`: the exact `TELEGRAM_WEBHOOK_SECRET` value
- Allowed update types: `my_chat_member`, `chat_join_request`, and `message`

Verify with Telegram `getWebhookInfo`. Do not put the bot token or webhook secret in logs, tickets, URLs, or this repository.

## Daily Vercel Cron

`vercel.json` calls `GET /api/v1/integrations/telegram/sync` once daily using `0 1 * * *` (01:00 UTC, approximately 04:00 in Saudi Arabia and Yemen). Hobby scheduling has hourly precision, so execution can occur within approximately 04:00-04:59 local time.

Vercel sends:

```text
Authorization: Bearer <CRON_SECRET>
```

The same route retains an operator-triggered `POST` protected by:

```text
Authorization: Bearer <TELEGRAM_SYNC_SECRET>
```

Both methods call one shared runner. Due memberships and outbox jobs are claimed with row locks and `SKIP LOCKED`; repeated or overlapping invocations do not process the same claimed row twice. The daily run handles up to 100 expired link tokens, 25 due outbox jobs, and 50 due memberships. If the initial limits are exceeded, use the authenticated POST to drain another bounded batch rather than increasing the scheduled frequency.

Failed Telegram operations remain queued with retry metadata. With daily scheduling, automatic retries occur on the next daily run; an administrator may trigger the protected POST after the backoff time when faster recovery is required.

## Operational controls

- Normal admin and student page loads read database state only.
- Channel health verification is an explicit admin action and calls Telegram on demand.
- Disabling a channel blocks new links but preserves existing memberships.
- Mass removal requires a disabled channel, a reason, and explicit confirmation. It creates one retryable outbox job per membership; it does not call Telegram in the HTTP request.
- Disconnect is blocked while memberships or outstanding jobs remain and never deletes history.
- Grant or entitlement revocation queues reconciliation. Disabling a code alone does not remove Telegram membership.

## Real Telegram UAT

1. Keep `TELEGRAM_ACCESS_ENABLED=false`; deploy schema and application, then run the closed-state smoke test.
2. Configure all secrets, deploy the daily Cron definition, register the webhook, and verify both externally while still closed.
3. Confirm signed and unsigned GET and POST requests all return `404` while the global release control is closed. Secret mismatches return `401` only after Telegram access is enabled.
4. Enable the global control and connect one private channel to one test subject. Keep channel linking disabled.
5. Run on-demand health verification and confirm invite/restrict permissions.
6. Enable linking for that channel only.
7. Test an account with active subject access: issue link, start bot, request join, verify approval and active membership.
8. Test a guest grant separately and verify it remains bound to that exact grant.
9. Confirm replayed/expired links fail, unknown join requests are declined, and no raw link token appears in logs or admin UI.
10. Revoke one access source while another account source remains and confirm membership stays active.
11. Revoke the final source, confirm website access stops immediately, then confirm Telegram removal on the next daily run or an authorized manual sync.
12. Disable the channel and verify new links stop while existing membership remains.
13. Queue mass removal in the danger zone, observe outbox retries, and disconnect only after all memberships and jobs settle.
