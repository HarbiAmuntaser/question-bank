import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(path, "utf8");

test("subscription tabs only query their active dataset", () => {
  const page = source("src/app/admin/subscriptions/page.tsx");
  assert.match(page, /tab === "plans" \? getPlansData/);
  assert.match(page, /tab === "codes" \? getCodesData/);
  assert.match(page, /tab === "entitlements" \? getEntitlementsData/);
  assert.match(page, /getTelegramAdminData\(params, path, tab === "telegram"\)/);

  const codeList = page.slice(page.indexOf("async function getCodesData"), page.indexOf("async function getEntitlementsData"));
  assert.doesNotMatch(codeList, /sessions:\s*\{|events:\s*\{/);
  assert.match(codeList, /codeAccessSessionBinding\.groupBy/);

  const actions = source("src/app/admin/subscriptions/actions.ts");
  assert.match(actions, /export async function getCodeAccessDetailsAction/);
  assert.match(actions, /sessions:[\s\S]*take: 100/);
  assert.match(actions, /events:[\s\S]*take: 50/);
});

test("subscription, Telegram and payment-order filters use the bounded education hierarchy", () => {
  const subscriptions = source("src/components/admin/subscriptions/subscriptions-admin.tsx");
  const telegram = source("src/components/admin/subscriptions/telegram-admin.tsx");
  const orders = source("src/app/admin/payment-orders/page.tsx");
  const picker = source("src/components/admin/admin-content-path-picker.tsx");

  assert.match(subscriptions, /AdminContentPathFilters/);
  assert.match(subscriptions, /universityType="university"/);
  assert.match(subscriptions, /countryCode="SA"/);
  assert.match(telegram, /AdminContentPathPicker/);
  assert.match(telegram, /paymentScope/);
  assert.match(orders, /AdminContentPathFilters/);
  assert.match(picker, /type="college"[\s\S]*type="major"[\s\S]*type="subject"/);
});

test("payment order listing aggregates ledger totals once instead of per order", () => {
  const reviews = source("src/lib/server/payment-reviews.ts");
  const orders = source("src/lib/server/payment-orders.ts");
  const listStart = reviews.indexOf("export async function listAdminOrders");
  const listEnd = reviews.indexOf("export async function getAdminOrder", listStart);
  const listBody = reviews.slice(listStart, listEnd);

  assert.match(listBody, /paymentLedgerEntry\.groupBy/);
  assert.match(listBody, /paidByOrder/);
  assert.match(listBody, /serializeOrder\(order, tx, paidByOrder/);
  assert.match(orders, /paidOverride\?: Prisma\.Decimal/);
});

test("audit datasets are paginated and loaded one view at a time", () => {
  const audit = source("src/app/admin/subscriptions/audit/page.tsx");
  assert.match(audit, /kind === "admin"[\s\S]*paymentAdminEvent\.findMany/);
  assert.match(audit, /kind === "redemptions"[\s\S]*paymentCodeRedemptionEvent\.findMany/);
  assert.match(audit, /skip: \(page - 1\) \* PAGE_SIZE/);
  assert.match(audit, /AdminContentPathFilters/);
});

test("payment review presents status and financial context without changing review actions", () => {
  const review = source("src/components/admin/payment-orders/payment-order-review.tsx");
  assert.match(review, /statusTone/);
  assert.match(review, /إجمالي الطلب/);
  assert.match(review, /المبلغ الموثق/);
  assert.match(review, /reviewActionLabels/);
  assert.match(review, /\/api\/v1\/admin\/payment-orders/);
});
